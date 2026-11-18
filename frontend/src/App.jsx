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
} from "./utils/api";
import { compressPrescriptionImage } from "./utils/imageCompress";

export default function App() {
  const [language, setLanguage] = useState("en");
  const [backendStatus, setBackendStatus] = useState("checking"); // checking | ok | error
  const [backendInfo, setBackendInfo] = useState(null);
  const [samples, setSamples] = useState([]);
  const [demoMode, setDemoMode] = useState(false);

  // View state: upload | processing | result
  const [view, setView] = useState("upload");
  const [error, setError] = useState(null);

  // Active prescription context (for instant language re-fetching & caching)
  const [activeSource, setActiveSource] = useState(null); // { type: 'file', file } | { type: 'sample', id }
  const [previewUrl, setPreviewUrl] = useState("");
  const [compressionStats, setCompressionStats] = useState(null);
  const [resultsByLang, setResultsByLang] = useState({}); // { en?: AnalysisResponse, hi?: AnalysisResponse }
  const [isSwitchingLanguage, setIsSwitchingLanguage] = useState(false);

  const abortRef = useRef(null);

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
    setView("upload");
    setError(null);
    setActiveSource(null);
    setPreviewUrl("");
    setCompressionStats(null);
    setResultsByLang({});
    setIsSwitchingLanguage(false);
  };

  const handleFileSelected = async (rawFile) => {
    setError(null);
    cancelOngoing();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const prepared = await compressPrescriptionImage(rawFile);
      setPreviewUrl(prepared.previewUrl);
      setCompressionStats({
        originalKb: prepared.originalKb,
        compressedKb: prepared.compressedKb,
      });
      setActiveSource({ type: "file", file: prepared.file, demoMode });
      setResultsByLang({});
      setView("processing");

      const data = await analyzeUploadedImage(
        prepared.file,
        language,
        demoMode,
        controller.signal,
      );
      setResultsByLang({ [language]: data });
      setView("result");
    } catch (err) {
      if (err.code === "CANCELLED") return;
      setView("upload");
      setError({ message: err.message, code: err.code });
    }
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

  const handleLanguageChange = async (nextLang) => {
    if (nextLang === language) return;
    setLanguage(nextLang);

    // If we are on the Result screen, either use cached translation or re-request from backend
    if (view === "result" && activeSource) {
      if (resultsByLang[nextLang]) return;

      cancelOngoing();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsSwitchingLanguage(true);

      try {
        const data =
          activeSource.type === "sample"
            ? await analyzeSamplePrescription(activeSource.id, nextLang, controller.signal)
            : await analyzeUploadedImage(
                activeSource.file,
                nextLang,
                activeSource.demoMode,
                controller.signal,
              );
        setResultsByLang((prev) => ({ ...prev, [nextLang]: data }));
      } catch (err) {
        if (err.code !== "CANCELLED") {
          setError({ message: err.message, code: err.code });
        }
      } finally {
        setIsSwitchingLanguage(false);
      }
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
            onFileSelected={handleFileSelected}
            onSampleSelected={handleSampleSelected}
            error={error}
            onDismissError={() => setError(null)}
          />
        )}

        {view === "processing" && (
          <ProcessingView
            language={language}
            previewUrl={previewUrl}
            compressionStats={compressionStats}
            onCancel={resetToUpload}
          />
        )}

        {view === "result" && currentResult && (
          <ResultView
            result={currentResult}
            language={language}
            previewUrl={previewUrl}
            isSwitchingLanguage={isSwitchingLanguage}
            onReset={resetToUpload}
          />
        )}
      </main>
    </div>
  );
}
