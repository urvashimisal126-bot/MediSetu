import { AlertTriangle, Moon, Sun, Sunrise } from "lucide-react";
import { COPY } from "../utils/i18n";

const SLOTS = [
  {
    key: "morning",
    icon: Sunrise,
    cardBg: "bg-amber-50/75 border-amber-200/90",
    headerBg: "bg-amber-100/80 text-amber-900",
    iconColor: "text-amber-600",
    badge: "bg-amber-200/70 text-amber-950",
  },
  {
    key: "afternoon",
    icon: Sun,
    cardBg: "bg-orange-50/70 border-orange-200/90",
    headerBg: "bg-orange-100/80 text-orange-900",
    iconColor: "text-orange-600",
    badge: "bg-orange-200/70 text-orange-950",
  },
  {
    key: "night",
    icon: Moon,
    cardBg: "bg-indigo-50/75 border-indigo-200/90",
    headerBg: "bg-indigo-100/85 text-indigo-950",
    iconColor: "text-indigo-600",
    badge: "bg-indigo-200/70 text-indigo-950",
  },
];

export default function TimelineSection({ medicines, language }) {
  const t = COPY[language];

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

              <div className="mt-4 flex-1 space-y-2.5">
                {items.length === 0 ? (
                  <p className="rounded-xl bg-white/60 px-3 py-4 text-center text-sm font-medium text-teal-900/45">
                    {t.noMedsSlot}
                  </p>
                ) : (
                  items.map((med, i) => (
                    <div
                      key={`${slot.key}-${med.name}-${i}`}
                      className="rounded-xl border border-white/80 bg-white/95 p-3 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold leading-snug text-teal-950">
                          {med.name}
                        </p>
                        {med.low_confidence && (
                          <AlertTriangle
                            className="h-4 w-4 shrink-0 text-amber-600"
                            title={t.lowConfidenceTag}
                          />
                        )}
                      </div>
                      <p className="mt-1 text-xs font-semibold text-teal-800">{med.dose}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-teal-900/70">
                        {med.instructions}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
