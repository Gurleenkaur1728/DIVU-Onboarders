import React, { useState } from "react";

export default function DivuChatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
  setMessages([{ role: "assistant", content: "Hi there! 👋 I'm DIVU Assistant. How can I help you today?" }]);
}, []);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", content: input };
    setMessages([...messages, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || "No response" },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Could not connect to DIVU chatbot." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-full shadow-lg"
      >
        💬
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 w-80 h-96 bg-white rounded-2xl shadow-xl border flex flex-col">
          <div className="p-3 font-bold text-emerald-600 border-b">DIVU Assistant</div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`p-2 rounded-lg text-sm ${
                  m.role === "user" ? "bg-emerald-100 self-end" : "bg-gray-100"
                }`}
              >
                {m.content}
              </div>
            ))}
            {loading && <p className="text-xs text-gray-400">DIVU Assistant typing...</p>}
          </div>
          <div className="flex p-2 border-t">
            <input
              className="flex-1 border rounded-lg px-2 py-1 text-sm focus:outline-none"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about DIVU..."
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              onClick={sendMessage}
              className="ml-2 px-3 py-1 bg-emerald-500 text-white rounded-lg"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}