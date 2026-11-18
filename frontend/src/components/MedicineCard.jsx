import { motion } from "framer-motion";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  HelpCircle,
  Info,
  Moon,
  Pill,
  Square,
  Sun,
  Sunrise,
  Volume2,
} from "lucide-react";
import { COPY } from "../utils/i18n";

const TIMING_CHIP = {
  morning: {
    icon: Sunrise,
    cls: "bg-amber-50 text-amber-900 border-amber-200",
  },
  afternoon: {
    icon: Sun,
    cls: "bg-orange-50 text-orange-900 border-orange-200",
  },
  night: {
    icon: Moon,
    cls: "bg-indigo-50 text-indigo-900 border-indigo-200",
  },
};

export default function MedicineCard({
  medicine,
  index,
  language,
  photoUrl = null,
  onPreviewPhoto,
  isVerified = false,
  isSpeaking,
  speechSupported,
  onListen,
  onStop,
}) {
  const t = COPY[language];

  const effectiveStatus =
    isVerified || medicine.match_status === "match"
      ? "match"
      : medicine.match_status || "no_photo";

  const isMatched = effectiveStatus === "match";
  const isNoMatch = effectiveStatus === "no_match";
  const isUnclear = effectiveStatus === "unclear";

  return (
    <article
      className={`rounded-3xl border bg-white p-5 shadow-sm transition-all sm:p-6 ${
        isMatched
          ? "border-emerald-400 bg-emerald-50/15 ring-2 ring-emerald-200/75"
          : isNoMatch || medicine.low_confidence
            ? "border-amber-300 ring-2 ring-amber-200/70"
            : "border-teal-900/10 hover:border-teal-300"
      }`}
    >
      {/* Low Confidence Warning Banner */}
      {medicine.low_confidence && (
        <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <span>{t.lowConfidenceTag}</span>
        </div>
      )}

      {/* Card Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3.5">
          {/* Matched Medicine Strip Photo Thumbnail OR Index Badge */}
          {photoUrl ? (
            <button
              type="button"
              onClick={() =>
                onPreviewPhoto?.({
                  url: photoUrl,
                  title: medicine.name,
                  subtitle: medicine.match_note || medicine.purpose,
                })
              }
              title={t.tapToEnlarge}
              className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-emerald-400 bg-slate-100 shadow-sm transition hover:scale-105 focus:outline-none"
            >
              <img
                src={photoUrl}
                alt={medicine.name}
                className="h-full w-full object-cover"
              />
              {medicine.photo_index && (
                <span className="absolute bottom-1 right-1 rounded bg-slate-950/75 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                  #{medicine.photo_index}
                </span>
              )}
            </button>
          ) : (
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-extrabold ${
                isMatched
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                  : medicine.low_confidence
                    ? "bg-amber-100 text-amber-800"
                    : "bg-teal-100/80 text-teal-800"
              }`}
            >
              {isMatched ? <CheckCircle2 className="h-6 w-6" /> : index + 1}
            </span>
          )}

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-extrabold leading-tight text-teal-950 sm:text-2xl">
                {medicine.name}
              </h3>

              {isMatched && (
                <motion.span
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 22 }}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-800 ring-1 ring-emerald-300"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  {medicine.match_status === "match" ? t.matchStatusMatch : t.verifiedBadge}
                </motion.span>
              )}

              {isNoMatch && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-900 ring-1 ring-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  {t.matchStatusNoMatch}
                </span>
              )}

              {isUnclear && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-3 py-1 text-xs font-extrabold text-slate-800 ring-1 ring-slate-300">
                  <HelpCircle className="h-3.5 w-3.5 text-slate-600" />
                  {t.matchStatusUnclear}
                </span>
              )}
            </div>

            <p className="mt-1 text-base font-medium text-teal-800/90">
              {medicine.purpose}
            </p>

            {medicine.match_note && effectiveStatus !== "no_photo" && (
              <p
                className={`mt-1.5 text-sm font-semibold ${
                  isMatched
                    ? "text-emerald-800"
                    : isNoMatch
                      ? "text-amber-800"
                      : "text-slate-700"
                }`}
              >
                {medicine.match_note}
              </p>
            )}
          </div>
        </div>

        {/* Individual Listen Button */}
        {speechSupported && (
          <button
            type="button"
            onClick={isSpeaking ? onStop : onListen}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
              isSpeaking
                ? "bg-rose-600 text-white shadow-sm hover:bg-rose-700"
                : "border border-teal-200 bg-teal-50 text-teal-900 hover:bg-teal-100"
            }`}
          >
            {isSpeaking ? (
              <>
                <Square className="h-4 w-4 fill-current" />
                <span>{t.stopButton}</span>
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4" />
                <span>{t.listenCard}</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Key Facts Row: Dose, Duration, Timing */}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-teal-50/60 p-3.5">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-800/70">
            <Pill className="h-3.5 w-3.5" />
            {t.doseLabel}
          </p>
          <p className="mt-1 text-base font-bold text-teal-950">{medicine.dose}</p>
        </div>

        <div className="rounded-2xl bg-teal-50/60 p-3.5">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-800/70">
            <CalendarClock className="h-3.5 w-3.5" />
            {t.durationLabel}
          </p>
          <p className="mt-1 text-base font-bold text-teal-950">{medicine.duration}</p>
        </div>

        <div className="rounded-2xl bg-teal-50/60 p-3.5">
          <p className="text-xs font-bold uppercase tracking-wider text-teal-800/70">
            {t.timelineTitle}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(medicine.timing || []).map((slot) => {
              const cfg = TIMING_CHIP[slot];
              if (!cfg) return null;
              const SlotIcon = cfg.icon;
              return (
                <span
                  key={slot}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${cfg.cls}`}
                >
                  <SlotIcon className="h-3.5 w-3.5" />
                  {t[slot]}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Instructions Box */}
      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-teal-900/8 bg-slate-50/80 px-4 py-3.5">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-teal-900/60">
            {t.instructionsLabel}
          </p>
          <p className="mt-0.5 text-base font-medium leading-relaxed text-teal-950">
            {medicine.instructions}
          </p>
        </div>
      </div>
    </article>
  );
}
