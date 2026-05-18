import { useState, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function VoiceRecorder({ onTranscription }) {
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState("");
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);

  async function startRecording() {
    chunksRef.current = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
    mediaRef.current = mr;

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mr.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      setStatus("Transcribiendo...");
      try {
        const form = new FormData();
        form.append("audio", blob, "recording.webm");
        const res = await fetch(`${API}/transcribe`, { method: "POST", body: form });
        const data = await res.json();
        setStatus("");
        onTranscription(data.text || "");
      } catch {
        setStatus("Error al transcribir. Intenta de nuevo.");
      }
    };

    mr.start();
    setRecording(true);
    setStatus("Grabando...");
  }

  function stopRecording() {
    if (mediaRef.current?.state === "recording") {
      mediaRef.current.stop();
    }
    setRecording(false);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={recording ? stopRecording : startRecording}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
          recording
            ? "bg-red-500 text-white animate-pulse"
            : "bg-brown-dark text-cream hover:bg-opacity-80"
        }`}
        style={!recording ? { backgroundColor: "#2A1F12", color: "#FAF1DA" } : {}}
      >
        {recording ? "⏹ Detener" : "🎤 Grabar"}
      </button>
      {status && <span className="text-xs text-gray-500">{status}</span>}
    </div>
  );
}
