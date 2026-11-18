import { useCallback, useEffect, useRef, useState } from "react";
import Header from "./components/Header";
import UploadView from "./components/UploadView";
import ProcessingView from "./components/ProcessingView";
import ResultView from "./components/ResultView";
import {
  analyzeSamplePrescription,
  analyzeUploadedImage,
  checkBackendHealth,
  fetchSamples,
  getSampleImageUrl,
  translatePrescription,
} from "./utils/api";
import { compressPrescriptionImage } from "./utils/imageCompress";
import { COPY } from "./utils/i18n";

const MAX_MEDICINE_PHOTOS = 5;

export default function App() {
  const [language, setLanguage] = useState("en");
  const [backendStatus, setBackendStatus] = useState("checking"); // checking | ok | error
  const [backendInfo, setBackendInfo] = useState(null);
  const [samples, setSamples] = useState([]);
  const [demoMode, setDemoMode] = useState(false);

  // View state: upload | processing | result
  const [view, setView] = useState("upload");
  const [error, setError] = useState(null);
  const [localWarning, setLocalWarning] = useState("");

  // Client-side staged photos (object URLs only; revoked on remove/reset/unmount)
  const [prescriptionPhoto, setPrescriptionPhoto] = useState(null); // { file, objectUrl, originalKb, compressedKb }
  const [medicinePhotos, setMedicinePhotos] = useState([]); // [{ id, file, objectUrl, originalKb, compressedKb }]

  // Active prescription context (for language switching & caching)
  const [activeSource, setActiveSource] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [compressionStats, setCompressionStats] = useState(null);
  const [resultsByLang, setResultsByLang] = useState({});
  const [isSwitchingLanguage, setIsSwitchingLanguage] = useState(false);
  const [translationError, setTranslationError] = useState(null);

  const abortRef = useRef(null);
  const objectUrlsRef = useRef(new Set());

  const trackObjectUrl = (blobOrFile) => {
    const url = URL.createObjectURL(blobOrFile);
    objectUrlsRef.current.add(url);
    return url;
  };

  const revokeObjectUrl = (url) => {
    if (url && objectUrlsRef.current.has(url)) {
      URL.revokeObjectURL(url);
      objectUrlsRef.current.delete(url);
    }
  };

  const revokeAllObjectUrls = () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
  };

  // Cleanup all object URLs on unmount
  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  const loadBackend = useCallback(async (showChecking = true) => {
    if (showChecking) setBackendStatus("checking");
    try {
      const info = await checkBackendHealth();
      setBackendInfo(info);
      setBackendStatus(info.status === "ok" ? "ok" : "error");
      const sampleList = await fetchSamples();
      setSamples(sampleList || []);
    } catch {
      setBackendStatus("error");
      setBackendInfo(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const info = await checkBackendHealth();
        if (!active) return;
        setBackendInfo(info);
        setBackendStatus(info.status === "ok" ? "ok" : "error");
        const sampleList = await fetchSamples();
        if (active) setSamples(sampleList || []);
      } catch {
        if (active) {
          setBackendStatus("error");
          setBackendInfo(null);
        }
      }
    }
    init();
    return () => {
      active = false;
    };
  }, []);

  const cancelOngoing = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  };

  const resetToUpload = () => {
    cancelOngoing();
    revokeAllObjectUrls();
    setView("upload");
    setError(null);
    setLocalWarning("");
    setTranslationError(null);
    setPrescriptionPhoto(null);
    setMedicinePhotos([]);
    setActiveSource(null);
    setPreviewUrl("");
    setCompressionStats(null);
    setResultsByLang({});
    setIsSwitchingLanguage(false);
  };

  const handlePrescriptionSelected = async (rawFile) => {
    setError(null);
    try {
      const prepared = await compressPrescriptionImage(rawFile);
      if (prescriptionPhoto?.objectUrl) {
        revokeObjectUrl(prescriptionPhoto.objectUrl);
      }
      const objectUrl = trackObjectUrl(prepared.file);
      setPrescriptionPhoto({
        file: prepared.file,
        objectUrl,
        originalKb: prepared.originalKb,
        compressedKb: prepared.compressedKb,
      });
    } catch (err) {
      setError({ message: err.message, code: "invalid_image" });
    }
  };

  const handleClearPrescription = () => {
    if (prescriptionPhoto?.objectUrl) {
      revokeObjectUrl(prescriptionPhoto.objectUrl);
    }
    setPrescriptionPhoto(null);
  };

  const handleAddMedicinePhotos = async (rawFiles) => {
    if (!rawFiles || rawFiles.length === 0) return;
    setError(null);
    setLocalWarning("");

    const remaining = MAX_MEDICINE_PHOTOS - medicinePhotos.length;
    if (remaining <= 0) {
      setLocalWarning(COPY[language].photoLimitReached);
      return;
    }

    const filesToProcess = rawFiles.slice(0, remaining);
    if (rawFiles.length > remaining) {
      setLocalWarning(COPY[language].photoLimitTrimmed);
    }

    const added = [];
    for (const rawFile of filesToProcess) {
      try {
        const prepared = await compressPrescriptionImage(rawFile);
        const objectUrl = trackObjectUrl(prepared.file);
        added.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file: prepared.file,
          objectUrl,
          originalKb: prepared.originalKb,
          compressedKb: prepared.compressedKb,
        });
      } catch (err) {
        setError({ message: err.message, code: "invalid_medicine_image" });
      }
    }

    if (added.length > 0) {
      setMedicinePhotos((prev) => [...prev, ...added].slice(0, MAX_MEDICINE_PHOTOS));
    }
  };

  const handleRemoveMedicinePhoto = (photoId) => {
    setLocalWarning("");
    setMedicinePhotos((prev) => {
      const target = prev.find((p) => p.id === photoId);
      if (target?.objectUrl) revokeObjectUrl(target.objectUrl);
      return prev.filter((p) => p.id !== photoId);
    });
  };

  const runAnalyzeUpload = async (rxPhoto, medPhotos) => {
    if (!rxPhoto?.file) return;
    setError(null);
    cancelOngoing();
    const controller = new AbortController();
    abortRef.current = controller;

    const medFiles = medPhotos.map((p) => p.file);

    setPreviewUrl(rxPhoto.objectUrl);
    setCompressionStats({
      originalKb: rxPhoto.originalKb,
      compressedKb: rxPhoto.compressedKb,
    });
    setActiveSource({
      type: "file",
      file: rxPhoto.file,
      medicineFiles: medFiles,
      demoMode,
    });
    setResultsByLang({});
    setView("processing");

    try {
      const data = await analyzeUploadedImage(
        rxPhoto.file,
        language,
        demoMode,
        controller.signal,
        medFiles,
      );
      setResultsByLang({ [language]: data });
      setView("result");
    } catch (err) {
      if (err.code === "CANCELLED") return;
      setView("upload");
      setError({ message: err.message, code: err.code });
    }
  };

  const handleSubmitAnalyze = () => {
    runAnalyzeUpload(prescriptionPhoto, medicinePhotos);
  };

  const handleTryWithoutMedicinePhotos = () => {
    medicinePhotos.forEach((p) => revokeObjectUrl(p.objectUrl));
    setMedicinePhotos([]);
    setLocalWarning("");
    runAnalyzeUpload(prescriptionPhoto, []);
  };

  const handleSampleSelected = async (sample) => {
    setError(null);
    cancelOngoing();
    const controller = new AbortController();
    abortRef.current = controller;

    setPreviewUrl(getSampleImageUrl(sample.image_url));
    setCompressionStats(null);
    setActiveSource({ type: "sample", id: sample.id });
    setResultsByLang({});
    setView("processing");

    try {
      const data = await analyzeSamplePrescription(sample.id, language, controller.signal);
      setResultsByLang({ [language]: data });
      setView("result");
    } catch (err) {
      if (err.code === "CANCELLED") return;
      setView("upload");
      setError({ message: err.message, code: err.code });
    }
  };

  const fetchTranslationForLang = async (targetLang, sourceOverride, cachedResults) => {
    const src = sourceOverride || activeSource;
    const cache = cachedResults || resultsByLang;
    if (!src) return;

    cancelOngoing();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsSwitchingLanguage(true);
    setTranslationError(null);

    try {
      let data;
      if (src.type === "sample") {
        data = await analyzeSamplePrescription(src.id, targetLang, controller.signal);
      } else {
        const existingBase = cache.en || cache.hi;
        if (existingBase) {
          data = await translatePrescription(existingBase, targetLang, controller.signal);
        } else {
          data = await analyzeUploadedImage(
            src.file,
            targetLang,
            src.demoMode,
            controller.signal,
            src.medicineFiles || [],
          );
        }
      }
      setResultsByLang((prev) => ({ ...prev, [targetLang]: data }));
    } catch (err) {
      if (err.code !== "CANCELLED") {
        setTranslationError({ message: err.message, code: err.code });
      }
    } finally {
      setIsSwitchingLanguage(false);
    }
  };

  const handleLanguageChange = async (nextLang) => {
    if (nextLang === language) return;
    setLanguage(nextLang);
    setTranslationError(null);

    if (view === "result" && activeSource) {
      if (resultsByLang[nextLang]) return;
      await fetchTranslationForLang(nextLang, activeSource, resultsByLang);
    }
  };

  const currentResult = resultsByLang[language] || resultsByLang.en || resultsByLang.hi;

  return (
    <div className="min-h-screen">
      <Header
        language={language}
        onLanguageChange={handleLanguageChange}
        backendStatus={backendStatus}
        backendInfo={backendInfo}
        onRetryHealth={loadBackend}
        onGoHome={resetToUpload}
        disabledLanguageSwitch={view === "processing" || isSwitchingLanguage}
      />

      <main>
        {view === "upload" && (
          <UploadView
            language={language}
            samples={samples}
            backendInfo={backendInfo}
            backendStatus={backendStatus}
            demoMode={demoMode}
            onToggleDemoMode={setDemoMode}
            prescriptionPhoto={prescriptionPhoto}
            onPrescriptionSelected={handlePrescriptionSelected}
            onClearPrescription={handleClearPrescription}
            medicinePhotos={medicinePhotos}
            onAddMedicinePhotos={handleAddMedicinePhotos}
            onRemoveMedicinePhoto={handleRemoveMedicinePhoto}
            onSubmitAnalyze={handleSubmitAnalyze}
            onTryWithoutMedicinePhotos={handleTryWithoutMedicinePhotos}
            onSampleSelected={handleSampleSelected}
            error={error}
            onDismissError={() => setError(null)}
            localWarning={localWarning}
          />
        )}

        {view === "processing" && (
          <ProcessingView
            language={language}
            previewUrl={previewUrl}
            medicinePhotos={medicinePhotos}
            compressionStats={compressionStats}
            onCancel={() => {
              cancelOngoing();
              setView("upload");
            }}
          />
        )}

        {view === "result" && currentResult && (
          <ResultView
            result={currentResult}
            language={language}
            previewUrl={previewUrl}
            medicinePhotos={medicinePhotos}
            isSwitchingLanguage={isSwitchingLanguage}
            translationError={translationError}
            onRetryTranslation={() => fetchTranslationForLang(language)}
            onReset={resetToUpload}
          />
        )}
      </main>
    </div>
  );
}
