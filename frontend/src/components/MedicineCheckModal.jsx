import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Circle,
  FileImage,
  HelpCircle,
  Loader2,
  RefreshCw,
  ScanLine,
  ShieldAlert,
  Square,
  Upload,
  Volume2,
  X,
} from "lucide-react";
import { COPY } from "../utils/i18n";
import { compressPrescriptionImage } from "../utils/imageCompress";
import { verifyMedicineImage } from "../utils/api";

const STATUS_STYLE = {
  match: {
    card: "border-emerald-300 bg-emerald-50/90",
    iconWrap: "bg-emerald-100 text-emerald-700",
    badge: "bg-emerald-600 text-white",
    titleText: "text-emerald-950",
    bodyText: "text-emerald-900",
    Icon: CheckCircle2,
  },
  no_match: {
    card: "border-amber-300 bg-amber-50/95",
    iconWrap: "bg-amber-100 text-amber-700",
    badge: "bg-amber-600 text-white",
    titleText: "text-amber-950",
    bodyText: "text-amber-900",
    Icon: AlertTriangle,
  },
  unclear: {
    card: "border-slate-300 bg-slate-100/90",
    iconWrap: "bg-slate-200 text-slate-700",
    badge: "bg-slate-600 text-white",
    titleText: "text-slate-900",
    bodyText: "text-slate-700",
    Icon: HelpCircle,
  },
};

export default function MedicineCheckModal({
  open,
  onClose,
  medicines,
  language,
  verifiedIndices = [],
  onVerifySuccess,
  speech,
}) {
  const t = COPY[language];
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const abortRef = useRef(null);

  // step: upload | preview | loading | result
  const [step, setStep] = useState("upload");
  const [dragging, setDragging] = useState(false);
  const [prepared, setPrepared] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const isSpeakingVerify =
    speech?.status === "speaking" && speech?.activeId === "verify-result";

  const resetModalState = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (isSpeakingVerify) {
      speech?.stop();
    }
    setStep("upload");
    setDragging(false);
    setPrepared(null);
    setResult(null);
    setError(null);
  };

  useEffect(() => {
    if (!open && abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, [open]);

  const handleClose = () => {
    resetModalState();
    onClose();
  };

  const handleFileChosen = async (rawFile) => {
    if (!rawFile) return;
    setError(null);
    try {
      const comp = await compressPrescriptionImage(rawFile);
      setPrepared(comp);
      setStep("preview");
    } catch (err) {
      setError(err.message || "Could not read this image.");
    }
  };

  const handleSubmit = async () => {
    if (!prepared?.file) return;
    setError(null);
    setStep("loading");

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const data = await verifyMedicineImage(
        prepared.file,
        medicines,
        language,
        controller.signal,
      );
      setResult(data);
      setStep("result");
      if (onVerifySuccess) {
        onVerifySuccess(data);
      }
    } catch (err) {
      if (err.code === "CANCELLED") return;
      setError(err.message || "Something went wrong while checking this medicine.");
      setStep("preview");
    }
  };

  const handleListenResult = () => {
    if (!speech?.supported || !result) return;
    if (isSpeakingVerify) {
      speech.stop();
      return;
    }
    const speechText = [result.message, result.reason, result.disclaimer]
      .filter(Boolean)
      .join(" ");
    speech.speak(speechText, "verify-result");
  };

  const handleScanNext = () => {
    if (isSpeakingVerify) speech?.stop();
    setPrepared(null);
    setResult(null);
    setError(null);
    setStep("upload");
  };

  const statusConfig = result ? STATUS_STYLE[result.status] || STATUS_STYLE.unclear : null;
  const StatusIcon = statusConfig?.Icon || HelpCircle;
  const statusBadgeLabel =
    result?.status === "match"
      ? t.checkMedMatchBadge
      : result?.status === "no_match"
        ? t.checkMedNoMatchBadge
        : t.checkMedUnclearBadge;

  const detectedText = [result?.detected?.name, result?.detected?.strength]
    .filter(Boolean)
    .join(" ");

  const allVerified = medicines.length > 0 && verifiedIndices.length >= medicines.length;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-xs sm:items-center sm:p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 36, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="check-med-modal-title"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
                  <ScanLine className="h-6 w-6" />
                </span>
                <div>
                  <h2
                    id="check-med-modal-title"
                    className="text-xl font-extrabold text-teal-950"
                  >
                    {t.checkMedTitle}
                  </h2>
                  <p className="text-xs font-medium text-teal-900/70 sm:text-sm">
                    {t.checkMedSubtitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-slate-900"
                aria-label={t.checkMedClose}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Compact Multi-Scan Progress Checklist */}
            {medicines.length > 0 && (
              <div className="mt-4 rounded-2xl border border-teal-900/10 bg-teal-50/50 px-3.5 py-2.5">
                <div className="flex items-center justify-between gap-2 text-xs font-bold text-teal-900">
                  <span>{t.checkMedProgress(verifiedIndices.length, medicines.length)}</span>
                  {allVerified && (
                    <span className="text-emerald-700">{t.checkMedAllVerified}</span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {medicines.map((med, idx) => {
                    const done = verifiedIndices.includes(idx);
                    return (
                      <span
                        key={`${med.name}-${idx}`}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          done
                            ? "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300"
                            : "bg-white text-teal-900/75 ring-1 ring-teal-900/10"
                        }`}
                      >
                        {done ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Circle className="h-3 w-3 text-teal-400" />
                        )}
                        <span className="max-w-[160px] truncate">{med.name}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <div
                className="mt-4 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-900"
                role="alert"
              >
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                <div>
                  <p className="font-bold">{t.checkMedErrorTitle}</p>
                  <p className="mt-0.5 text-rose-800">{error}</p>
                </div>
              </div>
            )}

            {/* Hidden Inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                handleFileChosen(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                handleFileChosen(e.target.files?.[0]);
                e.target.value = "";
              }}
            />

            {/* Step 1: Upload / Capture */}
            {step === "upload" && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  handleFileChosen(e.dataTransfer.files?.[0]);
                }}
                className={`mt-5 rounded-2xl border-2 border-dashed p-6 text-center transition ${
                  dragging
                    ? "border-teal-500 bg-teal-50/70"
                    : "border-teal-300/80 bg-teal-50/30"
                }`}
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
                  <Upload className="h-7 w-7" />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-teal-900/80">
                  {t.checkMedModalHint}
                </p>

                <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-teal-700 px-5 py-3.5 text-base font-bold text-white shadow-md shadow-teal-700/20 transition hover:bg-teal-800"
                  >
                    <Camera className="h-5 w-5" />
                    <span>{t.takePhoto}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-teal-200 bg-white px-5 py-3.5 text-base font-bold text-teal-900 transition hover:bg-teal-50"
                  >
                    <FileImage className="h-5 w-5 text-teal-700" />
                    <span>{t.chooseGallery}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Preview before submit */}
            {step === "preview" && prepared && (
              <div className="mt-5 space-y-4">
                <div className="overflow-hidden rounded-2xl border border-teal-900/10 bg-slate-100">
                  <img
                    src={prepared.previewUrl}
                    alt="Medicine strip preview"
                    className="max-h-64 w-full object-contain"
                  />
                </div>
                <p className="text-center text-xs font-semibold text-teal-800/75">
                  {t.compressedNote(prepared.originalKb, prepared.compressedKb)}
                </p>

                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-teal-700 px-6 py-3.5 text-base font-extrabold text-white shadow-md shadow-teal-700/20 transition hover:bg-teal-800"
                  >
                    <ScanLine className="h-5 w-5" />
                    <span>{t.checkMedSubmit}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleScanNext}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-teal-900/15 bg-white px-5 py-3.5 text-sm font-bold text-teal-900 transition hover:bg-teal-50"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>{t.checkMedChangePhoto}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Loading ("Reading the label...") */}
            {step === "loading" && (
              <div className="mt-6 py-6 text-center">
                {prepared?.previewUrl && (
                  <div className="relative mx-auto mb-5 h-36 w-56 overflow-hidden rounded-2xl border border-teal-200 bg-teal-50">
                    <img
                      src={prepared.previewUrl}
                      alt="Scanning label"
                      className="h-full w-full object-cover opacity-85"
                    />
                    <div className="animate-scan-line pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_16px_4px_rgba(20,184,166,0.6)]" />
                  </div>
                )}
                <Loader2 className="mx-auto h-9 w-9 animate-spin text-teal-700" />
                <p className="mt-3 text-lg font-extrabold text-teal-950">
                  {t.checkMedReading}
                </p>
                <p className="mt-1 text-sm text-teal-900/70">{t.checkMedReadingHint}</p>
              </div>
            )}

            {/* Step 4: Result Card (Match / No match / Unclear) */}
            {step === "result" && result && statusConfig && (
              <div className="mt-5 space-y-4">
                <div className={`rounded-3xl border-2 p-5 ${statusConfig.card}`}>
                  <div className="flex items-start gap-4">
                    <motion.div
                      initial={{ scale: 0.35, rotate: -12, opacity: 0 }}
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 420, damping: 20 }}
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${statusConfig.iconWrap}`}
                    >
                      <StatusIcon className="h-8 w-8" />
                    </motion.div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`inline-block rounded-full px-3 py-0.5 text-xs font-extrabold uppercase tracking-wide ${statusConfig.badge}`}
                        >
                          {statusBadgeLabel}
                        </span>

                        {speech?.supported && (
                          <button
                            type="button"
                            onClick={handleListenResult}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                              isSpeakingVerify
                                ? "bg-rose-600 text-white hover:bg-rose-700"
                                : "bg-white/90 text-teal-900 shadow-xs ring-1 ring-black/10 hover:bg-white"
                            }`}
                          >
                            {isSpeakingVerify ? (
                              <>
                                <Square className="h-3.5 w-3.5 fill-current" />
                                <span>{t.stopButton}</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="h-3.5 w-3.5" />
                                <span>{t.checkMedListenResult}</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {result.status === "match" && result.matched_medicine && (
                        <p
                          className={`mt-2 text-lg font-extrabold leading-snug ${statusConfig.titleText}`}
                        >
                          {t.checkMedMatchPrefix} {result.matched_medicine}
                        </p>
                      )}

                      <p
                        className={`mt-1.5 text-base font-semibold leading-relaxed ${statusConfig.bodyText}`}
                      >
                        {result.message}
                      </p>

                      {result.reason && (
                        <p className="mt-1 text-sm text-slate-700">{result.reason}</p>
                      )}
                    </div>
                  </div>

                  {/* Detected label details */}
                  {detectedText && (
                    <div className="mt-4 rounded-2xl border border-black/5 bg-white/85 px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        {t.checkMedDetectedLabel}
                      </p>
                      <p className="mt-0.5 text-base font-bold text-slate-900">
                        {detectedText}
                      </p>
                    </div>
                  )}
                </div>

                {/* Always-visible pharmacist disclaimer */}
                <div className="flex items-center gap-2.5 rounded-2xl border border-teal-900/10 bg-teal-950 px-4 py-3 text-sm font-semibold text-teal-50">
                  <ShieldAlert className="h-5 w-5 shrink-0 text-teal-300" />
                  <span>{result.disclaimer}</span>
                </div>

                {/* Multi-scan & Close Actions */}
                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleScanNext}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-teal-700 px-5 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-teal-800"
                  >
                    <Camera className="h-5 w-5" />
                    <span>
                      {result.status === "unclear"
                        ? t.checkMedRetry
                        : allVerified
                          ? t.checkMedTryAnother
                          : t.checkMedScanNext}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-2xl border border-teal-900/15 bg-white px-6 py-3.5 text-base font-bold text-teal-900 transition hover:bg-teal-50"
                  >
                    {t.checkMedClose}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
