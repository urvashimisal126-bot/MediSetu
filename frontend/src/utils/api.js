import axios from "axios";

export const API_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8001").replace(/\/$/, "");

const api = axios.create({
  baseURL: API_URL,
  timeout: 90000,
});

export async function checkBackendHealth() {
  const started = performance.now();
  const { data } = await api.get("/health", { timeout: 6000 });
  const latencyMs = Math.round(performance.now() - started);
  return { ...data, latencyMs };
}

export async function fetchSamples() {
  const { data } = await api.get("/samples");
  return data;
}

export function getSampleImageUrl(imagePath) {
  if (!imagePath) return "";
  if (imagePath.startsWith("http")) return imagePath;
  return `${API_URL}${imagePath}`;
}

export async function analyzeUploadedImage(
  file,
  language = "en",
  demoMode = false,
  signal,
  medicineFiles = [],
) {
  const formData = new FormData();
  formData.append("image", file);
  (medicineFiles || []).forEach((medFile) => {
    if (medFile) formData.append("medicine_images", medFile);
  });
  formData.append("language", language);
  formData.append("demo_mode", String(Boolean(demoMode)));

  try {
    const { data } = await api.post("/analyze", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      signal,
    });
    return data;
  } catch (err) {
    if (axios.isCancel(err)) {
      const cancelErr = new Error("CANCELLED");
      cancelErr.code = "CANCELLED";
      throw cancelErr;
    }
    const detail =
      err?.response?.data?.detail ||
      (err.code === "ECONNABORTED"
        ? "The AI scan took longer than expected because Google Gemini is busy right now. Please tap Try Again."
        : err.code === "ERR_NETWORK"
          ? "Cannot reach the MediSetu backend server. Make sure FastAPI is running and try again."
          : "Something went wrong while analyzing your prescription. Please try again.");
    const error = new Error(detail);
    error.code = err?.response?.data?.code || "network_error";
    error.status = err?.response?.status || 0;
    throw error;
  }
}

export async function analyzeSamplePrescription(sampleId, language = "en", signal) {
  const formData = new FormData();
  formData.append("sample_id", sampleId);
  formData.append("language", language);

  try {
    const { data } = await api.post("/analyze-sample", formData, { signal });
    return data;
  } catch (err) {
    if (axios.isCancel(err)) {
      const cancelErr = new Error("CANCELLED");
      cancelErr.code = "CANCELLED";
      throw cancelErr;
    }
    const detail =
      err?.response?.data?.detail || "Could not load sample prescription from backend.";
    const error = new Error(detail);
    error.code = err?.response?.data?.code || "sample_error";
    throw error;
  }
}

export async function translatePrescription(baseResult, targetLanguage, signal) {
  try {
    const { data } = await api.post(
      "/translate",
      {
        medicines: baseResult.medicines || [],
        unmatched_photos: baseResult.unmatched_photos || [],
        summary: baseResult.summary || "",
        questions_for_doctor: baseResult.questions_for_doctor || [],
        target_language: targetLanguage,
        source: baseResult.source || "gemini",
      },
      { signal },
    );
    return data;
  } catch (err) {
    if (axios.isCancel(err)) {
      const cancelErr = new Error("CANCELLED");
      cancelErr.code = "CANCELLED";
      throw cancelErr;
    }
    const detail =
      err?.response?.data?.detail ||
      (err.code === "ERR_NETWORK"
        ? "Cannot reach the MediSetu backend server to translate. Please check the server and retry."
        : "Could not translate the prescription right now. Please tap Retry.");
    const error = new Error(detail);
    error.code = err?.response?.data?.code || "translation_error";
    error.status = err?.response?.status || 0;
    throw error;
  }
}

export async function verifyMedicineImage(file, medicines, language = "en", signal) {
  const formData = new FormData();
  formData.append("image", file);
  formData.append(
    "medicines",
    JSON.stringify(
      (medicines || []).map((m) => ({
        name: m.name,
        dose: m.dose || "",
      })),
    ),
  );
  formData.append("language", language);

  try {
    const { data } = await api.post("/verify", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      signal,
    });
    return data;
  } catch (err) {
    if (axios.isCancel(err)) {
      const cancelErr = new Error("CANCELLED");
      cancelErr.code = "CANCELLED";
      throw cancelErr;
    }
    const detail =
      err?.response?.data?.detail ||
      (err.code === "ECONNABORTED"
        ? "Label check took longer than expected. Please tap Try Again."
        : err.code === "ERR_NETWORK"
          ? "Cannot reach the MediSetu backend server. Make sure FastAPI is running and try again."
          : "Something went wrong while checking this medicine. Please try again.");
    const error = new Error(detail);
    error.code = err?.response?.data?.code || "verify_error";
    error.status = err?.response?.status || 0;
    throw error;
  }
}
