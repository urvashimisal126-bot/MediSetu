import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { COPY } from "../utils/i18n";

export default function ProcessingView({
  language,
  previewUrl,
  medicinePhotos = [],
  compressionStats,
  onCancel,
}) {
  const t = COPY[language];
  const [stepIdx, setStepIdx] = useState(0);
  const hasMedPhotos = medicinePhotos.length > 0;
  const steps = hasMedPhotos ? t.processingWithMedsSteps : t.processingSteps;
  const title = hasMedPhotos ? t.processingWithMedsTitle : t.processingTitle;

  useEffect(() => {
    const timers = [
      setTimeout(() => setStepIdx(1), 650),
      setTimeout(() => setStepIdx(2), 1800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-16"
    >
      <div className="rounded-3xl border border-teal-900/10 bg-white p-7 text-center shadow-xl shadow-teal-950/[0.06] sm:p-10">
        {/* Scanning Preview Thumbnail */}
        {previewUrl && (
          <div className="relative mx-auto mb-6 h-44 w-64 overflow-hidden rounded-2xl border border-teal-200 bg-teal-50 shadow-inner">
            <img
              src={previewUrl}
              alt="Prescription being analyzed"
              className="h-full w-full object-cover opacity-90"
            />
            <div className="animate-scan-line pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_16px_4px_rgba(20,184,166,0.6)]" />
          </div>
        )}

        {/* Medicine strip thumbnails when present */}
        {hasMedPhotos && (
          <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
            {medicinePhotos.map((photo, idx) => (
              <div
                key={photo.id}
                className="relative h-12 w-12 overflow-hidden rounded-xl border border-teal-200 bg-white shadow-xs"
              >
                <img
                  src={photo.objectUrl}
                  alt={`Medicine ${idx + 1}`}
                  className="h-full w-full object-cover"
                />
                <span className="absolute bottom-0.5 right-0.5 rounded bg-teal-900/80 px-1 text-[10px] font-bold text-white">
                  {idx + 1}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>

        <h2 className="mt-4 text-2xl font-extrabold text-teal-950">{title}</h2>

        {compressionStats && (
          <p className="mt-1.5 text-xs font-semibold text-teal-700">
            {t.compressedNote(compressionStats.originalKb, compressionStats.compressedKb)}
          </p>
        )}

        {/* Step Checklist */}
        <ul className="mx-auto mt-6 max-w-sm space-y-2.5 text-left">
          {steps.map((label, idx) => {
            const done = idx < stepIdx;
            const active = idx === stepIdx;
            return (
              <li
                key={label}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-teal-50 text-teal-950"
                    : done
                      ? "text-emerald-700"
                      : "text-teal-900/40"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                ) : active ? (
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin text-teal-600" />
                ) : (
                  <span className="h-5 w-5 shrink-0 rounded-full border-2 border-teal-200" />
                )}
                <span>{label}</span>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={onCancel}
          className="mt-7 inline-flex items-center gap-1.5 rounded-xl border border-teal-900/15 px-5 py-2.5 text-sm font-semibold text-teal-900/75 transition hover:bg-teal-50 hover:text-teal-950"
        >
          <X className="h-4 w-4" />
          <span>{t.cancel}</span>
        </button>
      </div>
    </motion.div>
  );
}
