import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Camera,
  FileImage,
  FileText,
  KeyRound,
  Languages,
  Lock,
  ShieldCheck,
  Sparkles,
  Upload,
  Volume2,
} from "lucide-react";
import { COPY } from "../utils/i18n";
import { getSampleImageUrl } from "../utils/api";

export default function UploadView({
  language,
  samples,
  backendInfo,
  backendStatus,
  demoMode,
  onToggleDemoMode,
  onFileSelected,
  onSampleSelected,
  error,
  onDismissError,
}) {
  const t = COPY[language];
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const showKeyHint =
    backendStatus === "ok" &&
    backendInfo &&
    !backendInfo.use_mock &&
    !backendInfo.api_key_valid_format;

  const handleFiles = (files) => {
    if (!files || files.length === 0) return;
    onFileSelected(files[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

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
              {samples.length > 0 && (
                <button
                  type="button"
                  onClick={() => onSampleSelected(samples[0])}
                  className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800"
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

      {/* Primary Upload Dropzone Card */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`mt-8 rounded-3xl border-2 border-dashed bg-white p-6 text-center shadow-xl shadow-teal-950/[0.05] transition-all sm:p-10 ${
          dragging
            ? "scale-[1.01] border-teal-500 bg-teal-50/60"
            : "border-teal-300/80 hover:border-teal-500/80"
        }`}
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-100 to-emerald-100 text-teal-700 shadow-inner">
          <Upload className="h-8 w-8" />
        </div>

        <h2 className="mt-4 text-2xl font-bold text-teal-950">{t.uploadTitle}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-teal-900/70 sm:text-base">
          {t.uploadHint}
        </p>

        {/* Hidden Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
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
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {/* Large Accessible Buttons */}
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-teal-700 px-7 py-4 text-lg font-bold text-white shadow-lg shadow-teal-700/25 transition hover:bg-teal-800 active:scale-[0.99] sm:w-auto"
          >
            <FileImage className="h-5 w-5" />
            <span>{t.chooseGallery}</span>
          </button>

          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-teal-200 bg-teal-50/70 px-7 py-4 text-lg font-bold text-teal-900 transition hover:border-teal-400 hover:bg-teal-100/70 active:scale-[0.99] sm:w-auto"
          >
            <Camera className="h-5 w-5 text-teal-700" />
            <span>{t.takePhoto}</span>
          </button>
        </div>

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
