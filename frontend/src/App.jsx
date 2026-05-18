import { useState, useRef, useEffect } from "react";
import ChatMessage from "./components/ChatMessage";
import VoiceRecorder from "./components/VoiceRecorder";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Input modes: text | voice | image
// Output modes: text | audio
export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [inputMode, setInputMode] = useState("text");
  const [outputMode, setOutputMode] = useState("text");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  }

  async function toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Strip the data URL prefix — backend only needs raw base64
        resolve(reader.result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function sendMessage(text) {
    if (!text.trim() && !imageFile) return;
    setLoading(true);

    setMessages((prev) => [
      ...prev,
      { role: "user", content: text, hasImage: !!imageFile },
    ]);
    setInput("");

    try {
      let image_b64 = null;
      if (imageFile) {
        image_b64 = await toBase64(imageFile);
        setImageFile(null);
        setImagePreview(null);
      }

      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, image_b64 }),
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content: data.reply,
          tool: data.tool_used || null,
          fromCache: data.from_cache || false,
        },
      ]);

      if (outputMode === "audio") await playAudio(data.reply);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "agent", content: "Error al conectar con el servidor.", tool: null, fromCache: false },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function playAudio(text) {
    try {
      const res = await fetch(`${API}/speak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const blob = await res.blob();
      new Audio(URL.createObjectURL(blob)).play();
    } catch {
      console.warn("TTS unavailable — text response shown");
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto">
      {/* Header */}
      <header className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "#8AC553" }}>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#2A1F12" }}>FinBot</h1>
          <p className="text-xs" style={{ color: "#8AC553" }}>Asistente financiero virtual</p>
        </div>

        <div className="flex gap-2">
          {/* Input mode toggle */}
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "#2A1F12" }}>
            {[["text","Texto"],["voice","Voz"],["image","Imagen"]].map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => { setInputMode(mode); setImageFile(null); setImagePreview(null); }}
                className="px-3 py-1 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: inputMode === mode ? "#2A1F12" : "transparent",
                  color: inputMode === mode ? "#FAF1DA" : "#2A1F12",
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {/* Output mode toggle */}
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "#8AC553" }}>
            {[["text","Texto"],["audio","Audio"]].map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setOutputMode(mode)}
                className="px-3 py-1 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: outputMode === mode ? "#8AC553" : "transparent",
                  color: outputMode === mode ? "#FAF1DA" : "#8AC553",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Chat history */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="text-center mt-16 text-sm" style={{ color: "#8AC553" }}>
            <p className="text-3xl mb-2">🐇</p>
            <p>Hola, soy FinBot. ¿En qué le puedo ayudar hoy?</p>
          </div>
        )}
        {messages.map((msg, i) => <ChatMessage key={i} message={msg} />)}
        {loading && (
          <div className="flex justify-start mb-3">
            <div className="px-4 py-3 rounded-2xl rounded-bl-sm text-sm border" style={{ backgroundColor: "#fff", borderColor: "#8AC553" }}>
              <span className="animate-pulse">FinBot está escribiendo...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-4 py-3 border-t" style={{ borderColor: "#8AC553" }}>
        {imagePreview && (
          <div className="mb-2 flex items-center gap-2">
            <img src={imagePreview} alt="preview" className="h-16 rounded-lg border" />
            <button onClick={() => { setImageFile(null); setImagePreview(null); }} className="text-xs text-red-500">✕ Quitar</button>
          </div>
        )}

        {inputMode === "voice" && (
          <div className="mb-2">
            <VoiceRecorder onTranscription={(text) => { setInput(text); if (text) sendMessage(text); }} />
          </div>
        )}

        {inputMode === "image" && (
          <div className="mb-2">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageSelect} className="hidden" />
            <button onClick={() => fileRef.current?.click()} className="text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "#E8A95C" }}>
              📷 Adjuntar imagen
            </button>
          </div>
        )}

        <div className="flex gap-2 items-end">
          <textarea
            rows={1}
            className="flex-1 resize-none rounded-xl px-4 py-2 text-sm border focus:outline-none"
            style={{ backgroundColor: "#fff", borderColor: "#8AC553", color: "#2A1F12" }}
            placeholder="Escribe un mensaje..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || (!input.trim() && !imageFile)}
            className="px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40"
            style={{ backgroundColor: "#2A1F12", color: "#FAF1DA" }}
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
