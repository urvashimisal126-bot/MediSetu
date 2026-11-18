import { useCallback, useEffect, useRef, useState } from "react";

function pickBestVoice(voices, language) {
  if (!voices || voices.length === 0) return null;

  if (language === "hi") {
    return (
      voices.find((v) => v.lang.toLowerCase() === "hi-in") ||
      voices.find((v) => v.lang.toLowerCase().startsWith("hi")) ||
      voices.find((v) => v.name.toLowerCase().includes("hindi")) ||
      null
    );
  }

  return (
    voices.find((v) => v.lang.toLowerCase() === "en-in") ||
    voices.find((v) => v.lang.toLowerCase() === "en-us") ||
    voices.find((v) => v.lang.toLowerCase().startsWith("en")) ||
    null
  );
}

export function buildFullSpeechText(result, language) {
  if (!result) return "";

  const timingNames =
    language === "hi"
      ? { morning: "सुबह", afternoon: "दोपहर", night: "रात" }
      : { morning: "morning", afternoon: "afternoon", night: "night" };

  const parts = [];
  if (result.summary) parts.push(result.summary);

  result.medicines.forEach((med, idx) => {
    const times = (med.timing || []).map((t) => timingNames[t] || t).join(", ");
    const matchSpoken = med.match_note ? ` ${med.match_note}` : "";
    if (language === "hi") {
      const warning = med.low_confidence
        ? " ध्यान दें: इस दवा की लिखावट अस्पष्ट है, कृपया डॉक्टर से पुष्टि करें।"
        : "";
      parts.push(
        `दवा नंबर ${idx + 1}: ${med.name}. ${med.purpose}. खुराक: ${med.dose}. समय: ${times || "डॉक्टर के अनुसार"}. ${med.instructions}. अवधि: ${med.duration}.${matchSpoken}${warning}`,
      );
    } else {
      const warning = med.low_confidence
        ? " Caution: the handwriting for this medicine was unclear, please verify with your doctor."
        : "";
      parts.push(
        `Medicine ${idx + 1}: ${med.name}. ${med.purpose}. Dose: ${med.dose}. Take in the ${times || "as advised"}. ${med.instructions}. Duration: ${med.duration}.${matchSpoken}${warning}`,
      );
    }
  });

  if (result.unmatched_photos && result.unmatched_photos.length > 0) {
    result.unmatched_photos.forEach((u) => {
      if (language === "hi") {
        parts.push(
          `चेतावनी: फोटो नंबर ${u.photo_index} (${u.detected_label || "अज्ञात दवा"}) आपके पर्चे से मेल नहीं खाती। ${u.note || ""}`,
        );
      } else {
        parts.push(
          `Warning: Photo ${u.photo_index} (${u.detected_label || "unknown medicine"}) does not match your prescription. ${u.note || ""}`,
        );
      }
    });
  }

  if (result.pharmacist_note) parts.push(result.pharmacist_note);
  if (result.disclaimer) parts.push(result.disclaimer);
  return parts.join(" ");
}

export function buildMedicineSpeechText(med, language) {
  const timingNames =
    language === "hi"
      ? { morning: "सुबह", afternoon: "दोपहर", night: "रात" }
      : { morning: "morning", afternoon: "afternoon", night: "night" };
  const times = (med.timing || []).map((t) => timingNames[t] || t).join(", ");
  const matchSpoken = med.match_note ? ` ${med.match_note}` : "";

  if (language === "hi") {
    return `${med.name}. ${med.purpose}. खुराक: ${med.dose}. समय: ${times || "डॉक्टर के अनुसार"}. ${med.instructions}. अवधि: ${med.duration}.${matchSpoken}`;
  }
  return `${med.name}. ${med.purpose}. Dose: ${med.dose}. When to take: ${times || "as advised"}. ${med.instructions}. For ${med.duration}.${matchSpoken}`;
}

export function useSpeech(language) {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [voices, setVoices] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | speaking | paused
  const [activeId, setActiveId] = useState(null); // "all" or medicine index
  const [rate, setRate] = useState(0.92);
  const utteranceRef = useRef(null);

  useEffect(() => {
    if (!supported) return;

    const loadVoices = () => {
      const list = window.speechSynthesis.getVoices();
      if (list && list.length > 0) setVoices(list);
    };

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, [supported]);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setStatus("idle");
    setActiveId(null);
  }, [supported]);

  // Cancel active speech when language changes or component unmounts
  useEffect(() => {
    if (!supported) return;
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [language, supported]);

  const speak = useCallback(
    (text, id = "all", customRate = rate) => {
      if (!supported || !text) return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === "hi" ? "hi-IN" : "en-IN";
      utterance.rate = customRate;
      utterance.pitch = 1.0;

      const bestVoice = pickBestVoice(voices, language);
      if (bestVoice) utterance.voice = bestVoice;

      utterance.onstart = () => {
        setStatus("speaking");
        setActiveId(id);
      };
      utterance.onend = () => {
        setStatus("idle");
        setActiveId(null);
      };
      utterance.onerror = () => {
        setStatus("idle");
        setActiveId(null);
      };

      utteranceRef.current = utterance;
      setStatus("speaking");
      setActiveId(id);
      window.speechSynthesis.speak(utterance);
    },
    [supported, language, voices, rate],
  );

  const pause = useCallback(() => {
    if (!supported) return;
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setStatus("paused");
    }
  }, [supported]);

  const resume = useCallback(() => {
    if (!supported) return;
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setStatus("speaking");
    }
  }, [supported]);

  return {
    supported,
    status,
    activeId,
    rate,
    setRate,
    speak,
    pause,
    resume,
    stop,
  };
}
