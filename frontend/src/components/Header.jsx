import { Activity, HeartHandshake, RefreshCw, WifiOff } from "lucide-react";
import { COPY } from "../utils/i18n";

export default function Header({
  language,
  onLanguageChange,
  backendStatus,
  backendInfo,
  onRetryHealth,
  onGoHome,
  disabledLanguageSwitch = false,
}) {
  const t = COPY[language];

  return (
    <header className="sticky top-0 z-30 border-b border-teal-900/10 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Brand */}
        <button
          type="button"
          onClick={onGoHome}
          className="group flex items-center gap-3 text-left focus:outline-none"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 text-white shadow-md shadow-teal-700/20 transition-transform group-hover:scale-105">
            <HeartHandshake className="h-6 w-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-teal-950">
                {t.brand}
              </span>
            </div>
            <p className="hidden text-xs font-medium text-teal-800/70 sm:block">
              {t.tagline}
            </p>
          </div>
        </button>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Backend Status Pill */}
          {backendStatus === "ok" && (
            <div
              className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/90 px-3 py-1.5 text-xs font-semibold text-emerald-800 md:flex"
              title={`FastAPI connected (${backendInfo?.model || "Gemini"} · ${backendInfo?.latencyMs ?? ""}ms)`}
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              <span>{t.backendConnected}</span>
              {backendInfo?.latencyMs != null && (
                <span className="text-emerald-700/70">· {backendInfo.latencyMs}ms</span>
              )}
            </div>
          )}

          {backendStatus === "checking" && (
            <div className="hidden items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 md:flex">
              <Activity className="h-3.5 w-3.5 animate-pulse" />
              <span>{t.backendChecking}</span>
            </div>
          )}

          {backendStatus === "error" && (
            <button
              type="button"
              onClick={onRetryHealth}
              className="flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
            >
              <WifiOff className="h-3.5 w-3.5" />
              <span>{t.backendOffline}</span>
              <RefreshCw className="ml-0.5 h-3 w-3" />
            </button>
          )}

          {/* Language Segmented Toggle */}
          <div
            className="inline-flex rounded-full border border-teal-900/15 bg-teal-50/80 p-1 shadow-inner"
            role="group"
            aria-label="Language selector"
          >
            <button
              type="button"
              disabled={disabledLanguageSwitch}
              onClick={() => onLanguageChange("en")}
              className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition-all ${
                language === "en"
                  ? "bg-teal-700 text-white shadow-sm"
                  : "text-teal-900/75 hover:text-teal-950"
              } disabled:opacity-60`}
            >
              English
            </button>
            <button
              type="button"
              disabled={disabledLanguageSwitch}
              onClick={() => onLanguageChange("hi")}
              className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition-all ${
                language === "hi"
                  ? "bg-teal-700 text-white shadow-sm"
                  : "text-teal-900/75 hover:text-teal-950"
              } disabled:opacity-60`}
            >
              हिंदी
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
