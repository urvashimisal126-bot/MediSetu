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
  PillBottle,
  Play,
  ScanLine,
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
import MedicineCheckModal from "./MedicineCheckModal";

function findMatchingMedicineIndex(medicines, matchedName) {
  if (!matchedName || !medicines || medicines.length === 0) return -1;
  const target = matchedName.trim().toLowerCase();

  const exactIdx = medicines.findIndex((m) => (m.name || "").trim().toLowerCase() === target);
  if (exactIdx !== -1) return exactIdx;

  const subIdx = medicines.findIndex((m) => {
    const n = (m.name || "").trim().toLowerCase();
    return n && (n.includes(target) || target.includes(n));
  });
  if (subIdx !== -1) return subIdx;

  const tokens = target.split(/[\s(),./-]+/).filter((w) => w.length >= 3);
  if (tokens.length === 0) return -1;

  let bestIdx = -1;
  let bestScore = 0;
  medicines.forEach((m, idx) => {
    const n = (m.name || "").toLowerCase();
    const score = tokens.reduce((acc, tok) => acc + (n.includes(tok) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
  });
  return bestScore > 0 ? bestIdx : -1;
}

export default function ResultView({
  result,
  language,
  previewUrl,
  medicinePhotos = [],
  isSwitchingLanguage,
  translationError,
  onRetryTranslation,
  onReset,
}) {
  const t = COPY[language];
  const speech = useSpeech(language);
  const [lightboxPhoto, setLightboxPhoto] = useState(null); // { url, title, subtitle }
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [extraVerifiedIndices, setExtraVerifiedIndices] = useState([]);
  const [checkedQuestions, setCheckedQuestions] = useState({});
  const [copied, setCopied] = useState(false);

  const medicines = result.medicines || [];
  const unmatchedPhotos = result.unmatched_photos || [];

  // Combine upfront matched medicines (from /analyze) + any extra strips scanned via Match My Medicine modal (/verify)
  const verifiedIndices = Array.from(
    new Set([
      ...medicines
        .map((m, idx) => (m.match_status === "match" ? idx : -1))
        .filter((idx) => idx !== -1),
      ...extraVerifiedIndices,
    ]),
  );

  const handleVerifySuccess = (verifyData) => {
    if (verifyData?.status !== "match" || !verifyData?.matched_medicine) return;
    const matchedIdx = findMatchingMedicineIndex(medicines, verifyData.matched_medicine);
    if (matchedIdx !== -1) {
      setExtraVerifiedIndices((prev) => (prev.includes(matchedIdx) ? prev : [...prev, matchedIdx]));
    }
  };

  const hasLowConfidence = medicines.some((m) => m.low_confidence);
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

      {/* Translating In-Progress Banner */}
      {isSwitchingLanguage && (
        <div
          className="flex items-center gap-3 rounded-2xl border border-teal-300 bg-teal-50 px-5 py-4 text-teal-950 shadow-xs"
          role="status"
        >
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-teal-700" />
          <p className="text-sm font-bold sm:text-base">{t.translatingBanner}</p>
        </div>
      )}

      {/* Translation Error Banner with Retry */}
      {translationError && !isSwitchingLanguage && (
        <div
          className="flex flex-col gap-3 rounded-2xl border-2 border-rose-200 bg-rose-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <p className="text-sm font-extrabold text-rose-900">{t.translationFailedTitle}</p>
              <p className="mt-0.5 text-xs text-rose-800 sm:text-sm">{translationError.message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRetryTranslation}
            className="shrink-0 rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white shadow-xs transition hover:bg-teal-800"
          >
            {t.retryTranslation}
          </button>
        </div>
      )}

      {/* Prominent Voice Readout Bar */}
      <section className="rounded-3xl bg-gradient-to-r from-teal-700 via-teal-700 to-emerald-700 p-5 text-white shadow-xl shadow-teal-900/15 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-xs">
              {isSpeakingAll ? (
                <div className="flex h-6 items-end gap-1">
                  <span
                    className="eq-bar w-1.5 rounded-full bg-white"
                    style={{ height: "100%", animationDelay: "0ms" }}
                  />
                  <span
                    className="eq-bar w-1.5 rounded-full bg-white"
                    style={{ height: "75%", animationDelay: "180ms" }}
                  />
                  <span
                    className="eq-bar w-1.5 rounded-full bg-white"
                    style={{ height: "90%", animationDelay: "340ms" }}
                  />
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

      {/* Unmatched Medicine Photos Amber Card */}
      {unmatchedPhotos.length > 0 && (
        <section
          className="rounded-3xl border-2 border-amber-300 bg-amber-50/95 p-5 shadow-sm sm:p-6"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />
            <div>
              <h2 className="text-lg font-extrabold text-amber-950 sm:text-xl">
                {t.unmatchedTitle}
              </h2>
              <p className="mt-0.5 text-sm font-medium text-amber-900/85">
                {t.unmatchedSubtitle}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {unmatchedPhotos.map((item, idx) => {
              const photoObj =
                item.photo_index && medicinePhotos[item.photo_index - 1]
                  ? medicinePhotos[item.photo_index - 1]
                  : null;
              return (
                <div
                  key={`unmatched-${item.photo_index}-${idx}`}
                  className="flex items-start gap-3.5 rounded-2xl border border-amber-200 bg-white p-3.5 shadow-xs"
                >
                  {photoObj && (
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxPhoto({
                          url: photoObj.objectUrl,
                          title: item.detected_label || t.photoNumber(item.photo_index),
                          subtitle: item.note,
                        })
                      }
                      className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 border-amber-300 bg-slate-100 transition hover:scale-105"
                    >
                      <img
                        src={photoObj.objectUrl}
                        alt={item.detected_label || `Photo ${item.photo_index}`}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute bottom-1 right-1 rounded bg-amber-900/85 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                        #{item.photo_index}
                      </span>
                    </button>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-900">
                      {t.photoNumber(item.photo_index)}
                    </span>
                    {item.detected_label && (
                      <p className="mt-1 text-base font-extrabold text-slate-900">
                        {item.detected_label}
                      </p>
                    )}
                    <p className="mt-1 text-sm leading-snug text-amber-950/85">{item.note}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
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
              onClick={() =>
                setLightboxPhoto({
                  url: previewUrl,
                  title: t.step1Label,
                  subtitle: "",
                })
              }
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-50 px-4 py-2.5 text-sm font-bold text-teal-900 transition hover:bg-teal-100"
            >
              <Eye className="h-4 w-4" />
              <span>{t.viewPrescription}</span>
            </button>
          </div>
        )}
      </section>

      {/* Daily Schedule Timeline (with Medicine Photo Thumbnails + Match Badges) */}
      <TimelineSection
        medicines={medicines}
        language={language}
        medicinePhotos={medicinePhotos}
        onPreviewPhoto={setLightboxPhoto}
      />

      {/* Medicine Cards */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-extrabold text-teal-950 sm:text-2xl">
            {t.medicinesTitle}
          </h2>
          <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-900">
            {t.medicinesCount(medicines.length)}
          </span>
        </div>

        <div className="space-y-4">
          {medicines.map((med, idx) => {
            const photoObj =
              med.photo_index && medicinePhotos[med.photo_index - 1]
                ? medicinePhotos[med.photo_index - 1]
                : null;
            return (
              <MedicineCard
                key={`${med.name}-${idx}`}
                medicine={med}
                index={idx}
                language={language}
                photoUrl={photoObj?.objectUrl || null}
                onPreviewPhoto={setLightboxPhoto}
                isVerified={verifiedIndices.includes(idx)}
                speechSupported={speech.supported}
                isSpeaking={speech.status === "speaking" && speech.activeId === `med-${idx}`}
                onListen={() => speech.speak(buildMedicineSpeechText(med, language), `med-${idx}`)}
                onStop={speech.stop}
              />
            );
          })}
        </div>
      </section>

      {/* Match My Medicine On-the-Spot Scanner Card (powered by real Gemini AI /verify) */}
      <section className="rounded-3xl border-2 border-teal-200/90 bg-gradient-to-br from-teal-50 via-white to-emerald-50/80 p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-700 text-white shadow-md shadow-teal-700/20">
              <PillBottle className="h-7 w-7" />
            </span>
            <div>
              <h2 className="text-xl font-extrabold text-teal-950 sm:text-2xl">
                {t.matchCardTitle}
              </h2>
              <p className="mt-1 text-sm font-medium text-teal-900/75 sm:text-base">
                {t.matchCardSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCheckModal(true)}
            className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-teal-700 px-6 py-4 text-base font-extrabold text-white shadow-lg shadow-teal-700/20 transition hover:bg-teal-800 active:scale-[0.99] sm:shrink-0"
          >
            <ScanLine className="h-5 w-5" />
            <span>{t.checkMedButton}</span>
          </button>
        </div>

        {/* Verification Checklist */}
        {medicines.length > 0 && (
          <div className="mt-5 rounded-2xl border border-teal-900/10 bg-white/85 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-teal-800">
                {t.checkMedChecklistTitle}
              </h3>
              <span
                className={`rounded-full px-3 py-0.5 text-xs font-bold ${
                  verifiedIndices.length >= medicines.length
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-teal-100 text-teal-900"
                }`}
              >
                {verifiedIndices.length >= medicines.length
                  ? t.checkMedAllVerified
                  : t.checkMedProgress(verifiedIndices.length, medicines.length)}
              </span>
            </div>

            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {medicines.map((med, idx) => {
                const isVerified = verifiedIndices.includes(idx);
                return (
                  <li
                    key={`check-${med.name}-${idx}`}
                    className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-sm transition ${
                      isVerified
                        ? "border-emerald-200 bg-emerald-50/80 text-emerald-950"
                        : "border-teal-900/8 bg-slate-50/70 text-teal-950"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      {isVerified ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                      ) : (
                        <Circle className="h-5 w-5 shrink-0 text-teal-300" />
                      )}
                      <span className="truncate font-bold">{med.name}</span>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        isVerified
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200/70 text-slate-600"
                      }`}
                    >
                      {isVerified ? t.verifiedBadge : t.checkMedPending}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
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

      {/* Always-Visible Safety Disclaimer & Pharmacist Confirmation */}
      <footer className="rounded-3xl border border-teal-900/15 bg-teal-950 px-6 py-5 text-teal-50 shadow-sm">
        <div className="flex items-start gap-3.5">
          <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-teal-300" />
          <div className="space-y-1.5">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-teal-300">
              {t.safetyHeading}
            </h3>
            <p className="text-base leading-relaxed text-white/95">{result.disclaimer}</p>
            {result.pharmacist_note && (
              <p className="text-sm font-bold text-teal-200">{result.pharmacist_note}</p>
            )}
          </div>
        </div>
      </footer>

      {/* Fullscreen Lightbox Preview Modal (for Prescription OR Medicine Strip Thumbnails) */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-3xl overflow-auto rounded-3xl bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                {lightboxPhoto.title && (
                  <h3 className="text-lg font-extrabold text-teal-950">{lightboxPhoto.title}</h3>
                )}
                {lightboxPhoto.subtitle && (
                  <p className="mt-0.5 text-sm text-teal-900/75">{lightboxPhoto.subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                aria-label={t.hidePrescription}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <img
              src={lightboxPhoto.url}
              alt={lightboxPhoto.title || "Full photo preview"}
              className="max-h-[74vh] w-full rounded-2xl bg-slate-50 object-contain"
            />
          </div>
        </div>
      )}

      {/* Match My Medicine On-the-Spot Modal */}
      <MedicineCheckModal
        open={showCheckModal}
        onClose={() => setShowCheckModal(false)}
        medicines={medicines}
        language={language}
        verifiedIndices={verifiedIndices}
        onVerifySuccess={handleVerifySuccess}
        speech={speech}
      />
    </motion.div>
  );
}
