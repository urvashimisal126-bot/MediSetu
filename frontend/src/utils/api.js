import axios from "axios";

export const API_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8001").replace(/\/$/, "");

const api = axios.create({
  baseURL: API_URL,
  timeout: 45000,
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

export async function analyzeUploadedImage(file, language = "en", demoMode = false, signal) {
  const formData = new FormData();
  formData.append("file", file);
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
      (err.code === "ERR_NETWORK"
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
