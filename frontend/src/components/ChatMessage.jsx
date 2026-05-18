import Badge from "./Badge";

export default function ChatMessage({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
          isUser
            ? "bg-cream text-brown-dark border border-orange-finbot/30 rounded-br-sm"
            : "bg-white text-brown-dark border border-green-finbot/40 rounded-bl-sm"
        }`}
        style={{
          backgroundColor: isUser ? "#FAF1DA" : "#ffffff",
          color: "#2A1F12",
        }}
      >
        {message.hasImage && (
          <div className="flex items-center gap-1 mb-1">
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
              📷 imagen adjunta
            </span>
          </div>
        )}
        <p className="whitespace-pre-wrap">{message.content}</p>
        {!isUser && (message.tool || message.fromCache) && (
          <div className="mt-2">
            <Badge tool={message.tool} fromCache={message.fromCache} />
          </div>
        )}
      </div>
    </div>
  );
}
