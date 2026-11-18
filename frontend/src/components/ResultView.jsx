import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Circle,
  Copy,
  Eye,
  Gauge,
  HelpCircle,
  Loader2,
  Pause,
  Play,
  ShieldAlert,
  Sparkles,
  Square,
  Volume2,
  X,
} from "lucide-react";
import { COPY } from "../utils/i18n";
import {
  buildFullSpeechText,
  buildMedicineSpeechText,
  useSpeech,
} from "../hooks/useSpeech";
import TimelineSection from "./TimelineSection";
import MedicineCard from "./MedicineCard";

export default function ResultView({
  result,
  language,
  previewUrl,
  isSwitchingLanguage,
  onReset,
}) {
  const t = COPY[language];
  const speech = useSpeech(language);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [checkedQuestions, setCheckedQuestions] = useState({});
  const [copied, setCopied] = useState(false);

  const hasLowConfidence = (result.medicines || []).some((m) => m.low_confidence);
  const isSpeakingAll = speech.status === "speaking" && speech.activeId === "all";
  const isPausedAll = speech.status === "paused" && speech.activeId === "all";

  const handleListenAll = () => {
    if (isSpeakingAll) {
      speech.pause();
      return;
    }
    if (isPausedAll) {
      speech.resume();
      return;
    }
    const text = buildFullSpeechText(result, language);
    speech.speak(text, "all");
  };

  const handleToggleSpeed = () => {
    const nextRate = speech.rate < 0.95 ? 1.0 : 0.85;
    speech.setRate(nextRate);
    if (speech.status === "speaking" && speech.activeId === "all") {
      const text = buildFullSpeechText(result, language);
      speech.speak(text, "all", nextRate);
    }
  };

  const handleToggleQuestion = (idx) => {
    setCheckedQuestions((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleCopyQuestions = async () => {
    const text = (result.questions_for_doctor || [])
      .map((q, i) => `${i + 1}. ${q}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  const sourceLabel =
    result.source === "gemini"
      ? t.sourceGemini
      : result.source === "sample"
        ? t.sourceSample
        : t.sourceMock;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-5xl space-y-6 px-4 pb-20 pt-6 sm:px-6 sm:pt-8"
    >
      {/* Top Action Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            speech.stop();
            onReset();
          }}
          className="inline-flex items-center gap-2 rounded-2xl border border-teal-900/15 bg-white px-4 py-2.5 text-sm font-bold text-teal-900 shadow-xs transition hover:bg-teal-50"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{t.scanAnother}</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {isSwitchingLanguage && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-900">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t.switchingLang}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-bold text-teal-800">
            <Sparkles className="h-3.5 w-3.5 text-teal-600" />
            {sourceLabel}
            {result.processing_ms ? ` · ${(result.processing_ms / 1000).toFixed(1)}s` : ""}
          </span>
        </div>
      </div>

      {/* Prominent Voice Readout Bar */}
      <section className="rounded-3xl bg-gradient-to-r from-teal-700 via-teal-700 to-emerald-700 p-5 text-white shadow-xl shadow-teal-900/15 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-xs">
              {isSpeakingAll ? (
                <div className="flex h-6 items-end gap-1">
                  <span className="eq-bar w-1.5 rounded-full bg-white" style={{ height: "100%", animationDelay: "0ms" }} />
                  <span className="eq-bar w-1.5 rounded-full bg-white" style={{ height: "75%", animationDelay: "180ms" }} />
                  <span className="eq-bar w-1.5 rounded-full bg-white" style={{ height: "90%", animationDelay: "340ms" }} />
                </div>
              ) : (
                <Volume2 className="h-7 w-7 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">{t.listenTitle}</h2>
              <p className="mt-0.5 text-sm text-teal-50/90">
                {speech.supported ? t.listenSubtitle : t.speechUnsupported}
              </p>
            </div>
          </div>

          {speech.supported && (
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleToggleSpeed}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/20"
              >
                <Gauge className="h-4 w-4" />
                <span>{speech.rate < 0.95 ? t.speedSlow : t.speedNormal}</span>
              </button>

              <button
                type="button"
                onClick={handleListenAll}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-base font-extrabold text-teal-900 shadow-md transition hover:bg-teal-50 active:scale-[0.99] sm:flex-none"
              >
                {isSpeakingAll ? (
                  <>
                    <Pause className="h-5 w-5 fill-current" />
                    <span>{t.pauseButton}</span>
                  </>
                ) : isPausedAll ? (
                  <>
                    <Play className="h-5 w-5 fill-current" />
                    <span>{t.resumeButton}</span>
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 fill-current" />
                    <span>{t.listenButton}</span>
                  </>
                )}
              </button>

              {(isSpeakingAll || isPausedAll) && (
                <button
                  type="button"
                  onClick={speech.stop}
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-rose-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-600"
                >
                  <Square className="h-4 w-4 fill-current" />
                  <span>{t.stopButton}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Low Confidence Global Alert */}
      {hasLowConfidence && (
        <div
          className="flex items-start gap-3.5 rounded-3xl border-2 border-amber-300 bg-amber-50 p-5 shadow-xs"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />
          <div>
            <h3 className="text-base font-extrabold text-amber-950">
              {t.unclearBannerTitle}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-amber-900">
              {t.unclearBannerBody}
            </p>
          </div>
        </div>
      )}

      {/* Plain-Language Summary + Original Prescription Thumbnail */}
      <section className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-3xl border border-teal-900/10 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-teal-700">
            {t.summaryTitle}
          </h2>
          <p className="mt-3 text-lg font-medium leading-relaxed text-teal-950 sm:text-xl">
            {result.summary}
          </p>
        </div>

        {previewUrl && (
          <div className="flex flex-col justify-between rounded-3xl border border-teal-900/10 bg-white p-4 shadow-sm">
            <div className="relative h-36 overflow-hidden rounded-2xl border border-teal-900/10 bg-teal-50">
              <img
                src={previewUrl}
                alt="Uploaded prescription"
                className="h-full w-full object-cover object-top"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowPhotoModal(true)}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-50 px-4 py-2.5 text-sm font-bold text-teal-900 transition hover:bg-teal-100"
            >
              <Eye className="h-4 w-4" />
              <span>{t.viewPrescription}</span>
            </button>
          </div>
        )}
      </section>

      {/* Daily Schedule Timeline */}
      <TimelineSection medicines={result.medicines || []} language={language} />

      {/* Medicine Cards */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-extrabold text-teal-950 sm:text-2xl">
            {t.medicinesTitle}
          </h2>
          <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-900">
            {t.medicinesCount((result.medicines || []).length)}
          </span>
        </div>

        <div className="space-y-4">
          {(result.medicines || []).map((med, idx) => (
            <MedicineCard
              key={`${med.name}-${idx}`}
              medicine={med}
              index={idx}
              language={language}
              speechSupported={speech.supported}
              isSpeaking={speech.status === "speaking" && speech.activeId === `med-${idx}`}
              onListen={() => speech.speak(buildMedicineSpeechText(med, language), `med-${idx}`)}
              onStop={speech.stop}
            />
          ))}
        </div>
      </section>

      {/* Stretch Feature: Questions to Ask Your Doctor */}
      {result.questions_for_doctor && result.questions_for_doctor.length > 0 && (
        <section className="rounded-3xl border border-teal-900/10 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <HelpCircle className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-extrabold text-teal-950 sm:text-xl">
                  {t.questionsTitle}
                </h2>
                <p className="mt-0.5 text-sm text-teal-900/70">{t.questionsSubtitle}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyQuestions}
              className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50/70 px-3.5 py-2 text-xs font-bold text-teal-900 transition hover:bg-teal-100"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? t.copiedQuestions : t.copyQuestions}</span>
            </button>
          </div>

          <ul className="mt-4 space-y-2.5">
            {result.questions_for_doctor.map((q, idx) => {
              const checked = Boolean(checkedQuestions[idx]);
              return (
                <li key={idx}>
                  <button
                    type="button"
                    onClick={() => handleToggleQuestion(idx)}
                    className={`flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition ${
                      checked
                        ? "border-emerald-200 bg-emerald-50/70 text-teal-900/75"
                        : "border-teal-900/10 bg-slate-50/60 text-teal-950 hover:border-teal-300"
                    }`}
                  >
                    {checked ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    ) : (
                      <Circle className="mt-0.5 h-5 w-5 shrink-0 text-teal-400" />
                    )}
                    <span className={`text-base font-medium ${checked ? "line-through" : ""}`}>
                      {q}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Always-Visible Safety Disclaimer */}
      <footer className="rounded-3xl border border-teal-900/15 bg-teal-950 px-6 py-5 text-teal-50 shadow-sm">
        <div className="flex items-start gap-3.5">
          <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-teal-300" />
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-teal-300">
              {t.safetyHeading}
            </h3>
            <p className="mt-1 text-base leading-relaxed text-white/95">
              {result.disclaimer}
            </p>
          </div>
        </div>
      </footer>

      {/* Fullscreen Prescription Preview Modal */}
      {showPhotoModal && previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
          onClick={() => setShowPhotoModal(false)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-3xl overflow-auto rounded-3xl bg-white p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowPhotoModal(false)}
              className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/80 text-white shadow-md transition hover:bg-slate-900"
              aria-label={t.hidePrescription}
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={previewUrl}
              alt="Full prescription preview"
              className="w-full rounded-2xl object-contain"
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
