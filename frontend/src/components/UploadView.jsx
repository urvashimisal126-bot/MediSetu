import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  FileImage,
  FileText,
  KeyRound,
  Languages,
  Lock,
  PillBottle,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
  Volume2,
  X,
} from "lucide-react";
import { COPY } from "../utils/i18n";
import { getSampleImageUrl } from "../utils/api";

const MAX_MEDICINE_PHOTOS = 5;

export default function UploadView({
  language,
  samples,
  backendInfo,
  backendStatus,
  demoMode,
  onToggleDemoMode,
  prescriptionPhoto,
  onPrescriptionSelected,
  onClearPrescription,
  medicinePhotos,
  onAddMedicinePhotos,
  onRemoveMedicinePhoto,
  onSubmitAnalyze,
  onTryWithoutMedicinePhotos,
  onSampleSelected,
  error,
  onDismissError,
  localWarning,
}) {
  const t = COPY[language];
  const rxFileInputRef = useRef(null);
  const rxCameraInputRef = useRef(null);
  const medFileInputRef = useRef(null);
  const medCameraInputRef = useRef(null);

  const [draggingRx, setDraggingRx] = useState(false);
  const [draggingMed, setDraggingMed] = useState(false);

  const showKeyHint =
    backendStatus === "ok" &&
    backendInfo &&
    !backendInfo.use_mock &&
    !backendInfo.api_key_valid_format;

  const canAddMoreMeds = medicinePhotos.length < MAX_MEDICINE_PHOTOS;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12"
    >
      {/* Hero */}
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50/90 px-3.5 py-1 text-xs font-bold tracking-wide text-teal-800">
          <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
          {t.heroBadge}
        </span>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-teal-950 sm:text-5xl sm:leading-[1.12]">
          {t.heroTitle}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-teal-900/75 sm:text-lg">
          {t.heroSubtitle}
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-6 rounded-2xl border-2 border-rose-200 bg-rose-50 p-5 shadow-sm"
          role="alert"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-rose-600" />
              <div>
                <h3 className="text-base font-bold text-rose-900">{t.errorTitle}</h3>
                <p className="mt-1 text-sm leading-relaxed text-rose-800">{error.message}</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {prescriptionPhoto && medicinePhotos.length > 0 && (
                <button
                  type="button"
                  onClick={onTryWithoutMedicinePhotos}
                  className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800"
                >
                  {t.tryWithoutMedPhotos}
                </button>
              )}
              {samples.length > 0 && (
                <button
                  type="button"
                  onClick={() => onSampleSelected(samples[0])}
                  className="rounded-xl border border-teal-300 bg-white px-4 py-2 text-sm font-bold text-teal-900 transition hover:bg-teal-50"
                >
                  {t.tryDemoUpload}
                </button>
              )}
              <button
                type="button"
                onClick={onDismissError}
                className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-800 transition hover:bg-rose-100"
              >
                {t.tryAgain}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Upload Workflow Card: Step 1 (Prescription) + Step 2 (Optional Medicine Photos) */}
      <div className="mt-8 space-y-5">
        {/* Block 1: 1. Prescription */}
        <section
          onDragOver={(e) => {
            e.preventDefault();
            setDraggingRx(true);
          }}
          onDragLeave={() => setDraggingRx(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDraggingRx(false);
            if (e.dataTransfer.files?.[0]) {
              onPrescriptionSelected(e.dataTransfer.files[0]);
            }
          }}
          className={`rounded-3xl border-2 bg-white p-6 shadow-xl shadow-teal-950/[0.05] transition-all sm:p-8 ${
            prescriptionPhoto
              ? "border-emerald-300"
              : draggingRx
                ? "scale-[1.01] border-dashed border-teal-500 bg-teal-50/60"
                : "border-dashed border-teal-300/80 hover:border-teal-500/80"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 text-lg font-extrabold text-teal-950 sm:text-xl">
              {prescriptionPhoto ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              ) : (
                <Upload className="h-5 w-5 text-teal-700" />
              )}
              {t.step1Label}
            </span>
            {prescriptionPhoto && (
              <button
                type="button"
                onClick={onClearPrescription}
                className="inline-flex items-center gap-1.5 rounded-xl border border-teal-900/15 bg-white px-3.5 py-1.5 text-xs font-bold text-teal-900 transition hover:bg-teal-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{t.changePrescription}</span>
              </button>
            )}
          </div>

          {/* Hidden Prescription Inputs */}
          <input
            ref={rxFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) onPrescriptionSelected(e.target.files[0]);
              e.target.value = "";
            }}
          />
          <input
            ref={rxCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) onPrescriptionSelected(e.target.files[0]);
              e.target.value = "";
            }}
          />

          {!prescriptionPhoto ? (
            <div className="mt-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-100 to-emerald-100 text-teal-700 shadow-inner">
                <Upload className="h-7 w-7" />
              </div>
              <h2 className="mt-3 text-xl font-bold text-teal-950 sm:text-2xl">
                {t.uploadTitle}
              </h2>
              <p className="mx-auto mt-1.5 max-w-md text-sm text-teal-900/70 sm:text-base">
                {t.uploadHint}
              </p>

              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                <button
                  type="button"
                  onClick={() => rxFileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-teal-700 px-7 py-4 text-lg font-bold text-white shadow-lg shadow-teal-700/25 transition hover:bg-teal-800 active:scale-[0.99] sm:w-auto"
                >
                  <FileImage className="h-5 w-5" />
                  <span>{t.chooseGallery}</span>
                </button>

                <button
                  type="button"
                  onClick={() => rxCameraInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-teal-200 bg-teal-50/70 px-7 py-4 text-lg font-bold text-teal-900 transition hover:border-teal-400 hover:bg-teal-100/70 active:scale-[0.99] sm:w-auto"
                >
                  <Camera className="h-5 w-5 text-teal-700" />
                  <span>{t.takePhoto}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 sm:flex-row">
              <img
                src={prescriptionPhoto.objectUrl}
                alt="Selected prescription"
                className="h-32 w-44 shrink-0 rounded-xl border border-emerald-200 bg-white object-cover shadow-xs"
              />
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p className="truncate text-base font-extrabold text-teal-950">
                  {prescriptionPhoto.file.name}
                </p>
                <p className="mt-1 text-xs font-semibold text-emerald-800">
                  {t.compressedNote(prescriptionPhoto.originalKb, prescriptionPhoto.compressedKb)}
                </p>
              </div>
            </div>
          )}

          {/* Optional API Key Hint + Demo Mode Toggle */}
          {showKeyHint && (
            <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-left">
              <div className="flex items-start gap-3">
                <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <div className="flex-1 text-xs leading-relaxed text-amber-950 sm:text-sm">
                  <p className="font-bold">{t.apiKeyHintTitle}</p>
                  <p className="mt-0.5 text-amber-900/85">{t.apiKeyHintBody}</p>
                  <label className="mt-3 inline-flex cursor-pointer items-center gap-2.5 font-semibold text-amber-950">
                    <input
                      type="checkbox"
                      checked={demoMode}
                      onChange={(e) => onToggleDemoMode(e.target.checked)}
                      className="h-4 w-4 rounded border-amber-400 accent-teal-700"
                    />
                    <span>{t.demoToggleLabel}</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Block 2: 2. Your medicines (optional) */}
        <section
          onDragOver={(e) => {
            e.preventDefault();
            if (canAddMoreMeds) setDraggingMed(true);
          }}
          onDragLeave={() => setDraggingMed(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDraggingMed(false);
            if (canAddMoreMeds && e.dataTransfer.files?.length) {
              onAddMedicinePhotos(Array.from(e.dataTransfer.files));
            }
          }}
          className={`rounded-3xl border bg-white p-6 shadow-sm transition-all sm:p-8 ${
            draggingMed
              ? "border-2 border-dashed border-teal-500 bg-teal-50/50"
              : "border-teal-900/10"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                <PillBottle className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-lg font-extrabold text-teal-950 sm:text-xl">
                  {t.step2Label}
                </h2>
                <p className="mt-0.5 text-sm text-teal-900/70">{t.step2Hint}</p>
              </div>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                medicinePhotos.length >= MAX_MEDICINE_PHOTOS
                  ? "bg-amber-100 text-amber-900"
                  : "bg-teal-100 text-teal-900"
              }`}
            >
              {medicinePhotos.length}/{MAX_MEDICINE_PHOTOS}
            </span>
          </div>

          {/* Hidden Medicine Multi-Photo Inputs */}
          <input
            ref={medFileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) {
                onAddMedicinePhotos(Array.from(e.target.files));
              }
              e.target.value = "";
            }}
          />
          <input
            ref={medCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) {
                onAddMedicinePhotos(Array.from(e.target.files));
              }
              e.target.value = "";
            }}
          />

          {localWarning && (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900">
              {localWarning}
            </p>
          )}

          {/* Thumbnail Grid */}
          {medicinePhotos.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {medicinePhotos.map((photo, idx) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="group relative overflow-hidden rounded-2xl border border-teal-900/15 bg-slate-50 shadow-xs"
                >
                  <img
                    src={photo.objectUrl}
                    alt={`Medicine photo ${idx + 1}`}
                    className="h-28 w-full object-cover"
                  />
                  <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-teal-900/85 text-xs font-extrabold text-white shadow-xs">
                    {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveMedicinePhoto(photo.id)}
                    aria-label={t.removePhoto}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/75 text-white shadow-sm transition hover:bg-rose-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="truncate bg-white/95 px-2 py-1 text-[11px] font-semibold text-teal-900/75">
                    {photo.compressedKb} KB
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Add Photo Buttons */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!canAddMoreMeds}
              onClick={() => medFileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-2xl border-2 border-teal-200 bg-teal-50/70 px-5 py-3 text-sm font-bold text-teal-900 transition hover:border-teal-400 hover:bg-teal-100/70 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4 text-teal-700" />
              <span>{t.addMedicinePhotos}</span>
            </button>

            <button
              type="button"
              disabled={!canAddMoreMeds}
              onClick={() => medCameraInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-2xl border border-teal-900/15 bg-white px-5 py-3 text-sm font-bold text-teal-900 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Camera className="h-4 w-4 text-teal-700" />
              <span>{t.captureMedicinePhoto}</span>
            </button>

            {!canAddMoreMeds && (
              <span className="text-xs font-semibold text-amber-800">
                {t.photoLimitReached}
              </span>
            )}
          </div>
        </section>

        {/* Primary Submit CTA */}
        <div className="flex flex-col items-center justify-center gap-2 pt-1">
          <button
            type="button"
            disabled={!prescriptionPhoto}
            onClick={onSubmitAnalyze}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-teal-700 to-emerald-700 px-8 py-4.5 text-lg font-extrabold text-white shadow-xl shadow-teal-700/25 transition hover:from-teal-800 hover:to-emerald-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto sm:min-w-[320px]"
          >
            <span>{t.explainButton}</span>
            <ArrowRight className="h-5 w-5" />
          </button>
          {prescriptionPhoto && (
            <p className="text-xs font-semibold text-teal-800/75">
              {t.explainWithPhotosNote(medicinePhotos.length)}
            </p>
          )}
        </div>
      </div>

      {/* Sample Prescriptions Section */}
      {samples.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold text-teal-950">
                <Sparkles className="h-5 w-5 text-teal-600" />
                {t.samplesTitle}
              </h2>
              <p className="mt-1 text-sm text-teal-900/70">{t.samplesSubtitle}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {samples.map((sample) => {
              const title = language === "hi" ? sample.title_hi : sample.title_en;
              const subtitle = language === "hi" ? sample.subtitle_hi : sample.subtitle_en;
              return (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => onSampleSelected(sample)}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-teal-900/10 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-md"
                >
                  <div className="relative h-28 w-full overflow-hidden border-b border-teal-900/5 bg-teal-50">
                    <img
                      src={getSampleImageUrl(sample.image_url)}
                      alt={title}
                      className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <span
                      className={`absolute right-2.5 top-2.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold shadow-sm ${
                        sample.has_unclear_item
                          ? "bg-amber-100 text-amber-900 ring-1 ring-amber-300"
                          : "bg-white/95 text-teal-800 ring-1 ring-teal-200"
                      }`}
                    >
                      {sample.has_unclear_item ? t.unclearBadge : t.clearBadge}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div>
                      <div className="flex items-center gap-1.5 text-teal-700">
                        <FileText className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-bold text-teal-950 group-hover:text-teal-700">
                          {title}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-teal-900/65">{subtitle}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Trust Pillars */}
      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-teal-900/8 bg-white/80 p-5">
          <Lock className="h-6 w-6 text-teal-700" />
          <h3 className="mt-3 text-base font-bold text-teal-950">{t.trust1Title}</h3>
          <p className="mt-1 text-sm text-teal-900/70">{t.trust1Desc}</p>
        </div>
        <div className="rounded-2xl border border-teal-900/8 bg-white/80 p-5">
          <Languages className="h-6 w-6 text-teal-700" />
          <h3 className="mt-3 text-base font-bold text-teal-950">{t.trust2Title}</h3>
          <p className="mt-1 text-sm text-teal-900/70">{t.trust2Desc}</p>
        </div>
        <div className="rounded-2xl border border-teal-900/8 bg-white/80 p-5">
          <Volume2 className="h-6 w-6 text-teal-700" />
          <h3 className="mt-3 text-base font-bold text-teal-950">{t.trust3Title}</h3>
          <p className="mt-1 text-sm text-teal-900/70">{t.trust3Desc}</p>
        </div>
      </section>
    </motion.div>
  );
}
