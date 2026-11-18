import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Info,
  Moon,
  Pill,
  Sun,
  Sunrise,
} from "lucide-react";
import { COPY } from "../utils/i18n";

const SLOTS = [
  {
    key: "morning",
    icon: Sunrise,
    cardBg: "bg-amber-50/75 border-amber-200/90",
    headerBg: "bg-amber-100/80 text-amber-900",
    iconColor: "text-amber-600",
    badge: "bg-amber-200/70 text-amber-950",
    pillBg: "bg-amber-100/70 text-amber-700",
  },
  {
    key: "afternoon",
    icon: Sun,
    cardBg: "bg-orange-50/70 border-orange-200/90",
    headerBg: "bg-orange-100/80 text-orange-900",
    iconColor: "text-orange-600",
    badge: "bg-orange-200/70 text-orange-950",
    pillBg: "bg-orange-100/70 text-orange-700",
  },
  {
    key: "night",
    icon: Moon,
    cardBg: "bg-indigo-50/75 border-indigo-200/90",
    headerBg: "bg-indigo-100/85 text-indigo-950",
    iconColor: "text-indigo-600",
    badge: "bg-indigo-200/70 text-indigo-950",
    pillBg: "bg-indigo-100/70 text-indigo-700",
  },
];

function MatchBadge({ status, t }) {
  if (!status || status === "no_photo") return null;

  if (status === "match") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-extrabold text-emerald-800 ring-1 ring-emerald-300">
        <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" />
        <span>{t.matchStatusMatch}</span>
      </span>
    );
  }
  if (status === "no_match") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-extrabold text-amber-900 ring-1 ring-amber-300">
        <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600" />
        <span>{t.matchStatusNoMatch}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-200/90 px-2 py-0.5 text-[11px] font-extrabold text-slate-800 ring-1 ring-slate-300">
      <HelpCircle className="h-3 w-3 shrink-0 text-slate-600" />
      <span>{t.matchStatusUnclear}</span>
    </span>
  );
}

export default function TimelineSection({
  medicines,
  language,
  medicinePhotos = [],
  onPreviewPhoto,
}) {
  const t = COPY[language];

  const hasUploadedPhotos = medicinePhotos.length > 0;
  const missingPhotoMeds = hasUploadedPhotos
    ? medicines.filter((m) => !m.photo_index || m.match_status === "no_photo")
    : [];

  return (
    <section className="rounded-3xl border border-teal-900/10 bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-5">
        <h2 className="text-xl font-extrabold text-teal-950 sm:text-2xl">{t.timelineTitle}</h2>
        <p className="mt-0.5 text-sm text-teal-900/70">{t.timelineSubtitle}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {SLOTS.map((slot) => {
          const Icon = slot.icon;
          const items = medicines.filter((m) => (m.timing || []).includes(slot.key));
          const slotLabel = t[slot.key];

          return (
            <div
              key={slot.key}
              className={`flex flex-col rounded-2xl border p-4 ${slot.cardBg}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${slot.headerBg}`}>
                    <Icon className={`h-5 w-5 ${slot.iconColor}`} />
                  </span>
                  <h3 className="text-lg font-extrabold text-teal-950">{slotLabel}</h3>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${slot.badge}`}>
                  {items.length}
                </span>
              </div>

              <div className="mt-4 flex-1 space-y-3">
                {items.length === 0 ? (
                  <p className="rounded-xl bg-white/60 px-3 py-4 text-center text-sm font-medium text-teal-900/45">
                    {t.noMedsSlot}
                  </p>
                ) : (
                  items.map((med, i) => {
                    const photoObj =
                      med.photo_index && medicinePhotos[med.photo_index - 1]
                        ? medicinePhotos[med.photo_index - 1]
                        : null;

                    return (
                      <motion.div
                        key={`${slot.key}-${med.name}-${i}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06, duration: 0.25 }}
                        className="rounded-2xl border border-white/90 bg-white/95 p-3 shadow-xs"
                      >
                        <div className="flex items-start gap-3">
                          {/* User Medicine Photo Thumbnail OR Pill Icon Fallback */}
                          {photoObj ? (
                            <button
                              type="button"
                              onClick={() =>
                                onPreviewPhoto?.({
                                  url: photoObj.objectUrl,
                                  title: med.name,
                                  subtitle: med.match_note || `${med.dose} · ${med.instructions}`,
                                })
                              }
                              title={t.tapToEnlarge}
                              className="group relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl border-2 border-emerald-300 bg-slate-100 shadow-xs transition hover:scale-105 hover:border-teal-500 focus:outline-none"
                            >
                              <img
                                src={photoObj.objectUrl}
                                alt={med.name}
                                className="h-full w-full object-cover"
                              />
                              <span className="absolute bottom-1 right-1 rounded bg-slate-950/75 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                                #{med.photo_index}
                              </span>
                            </button>
                          ) : (
                            <span
                              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${slot.pillBg}`}
                            >
                              <Pill className="h-6 w-6" />
                            </span>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-1.5">
                              <p className="text-sm font-extrabold leading-snug text-teal-950">
                                {med.name}
                              </p>
                              {med.low_confidence && (
                                <AlertTriangle
                                  className="h-4 w-4 shrink-0 text-amber-600"
                                  title={t.lowConfidenceTag}
                                />
                              )}
                            </div>
                            <p className="mt-0.5 text-xs font-bold text-teal-800">{med.dose}</p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-teal-900/75">
                              {med.instructions}
                            </p>
                          </div>
                        </div>

                        {/* Match Status Badge + Note */}
                        {med.match_status && med.match_status !== "no_photo" && (
                          <div className="mt-2.5 border-t border-slate-100 pt-2">
                            <MatchBadge status={med.match_status} t={t} />
                            {med.match_note && (
                              <p className="mt-1 text-xs leading-snug text-slate-600">
                                {med.match_note}
                              </p>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Gentle Hint for Prescribed Medicines Without a Photo */}
      {missingPhotoMeds.length > 0 && (
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-teal-900/10 bg-teal-50/60 px-4 py-3 text-sm font-medium text-teal-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
          <span>{t.noPhotoHint(missingPhotoMeds.map((m) => m.name).join(", "))}</span>
        </div>
      )}
    </section>
  );
}
