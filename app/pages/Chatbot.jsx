import { useState } from "react";
import axios from "axios";
import AppLayout from "../../src/AppLayout.jsx";

export default function Chatbot() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    // show user message
    setMessages((prev) => [...prev, { from: "user", text: input }]);

    const userMessage = input;
    setInput("");

    try {
      const res = await axios.post("/api/chat", {
        message: userMessage,
      });

      const botReply = res.data.reply;

      setMessages((prev) => [
        ...prev,
        { from: "bot", text: botReply },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: "⚠️ Error: Could not connect to AI server." },
      ]);
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 min-h-dvh p-6 space-y-6 mt-8">
        <h1 className="text-3xl font-bold  mb-6">
          AI Assistant
        </h1>

          <div className="bg-white dark:bg-DivuDarkGreen/90
           border border-gray-500 rounded-lg shadow-sm p-6">
            {/* Chat Messages Area */}
            <div className="h-[500px] overflow-y-auto border border-gray-400 rounded-lg p-4 mb-4 bg-gray-100 dark:bg-black/50">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p className="text-center">
                    Ask me anything about your onboarding process!
                  </p>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={`mb-4 ${m.from === "user" ? "text-right" : "text-left"}`}>
                    <div className={`inline-block max-w-[80%] ${
                      m.from === "user" 
                        ? "bg-emerald-600 text-white rounded-lg px-4 py-2" 
                        : "bg-white border border-gray-200 rounded-lg px-4 py-2"
                    }`}>
                      <p className={`text-xs font-semibold mb-1 ${
                        m.from === "user" ? "text-emerald-100" : "text-emerald-600"
                      }`}>
                        {m.from === "user" ? "You" : "AI Assistant"}
                      </p>
                      <p className={m.from === "user" ? "text-white" : "text-gray-900"}>
                        {m.text}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input Area */}
            <div className="flex gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Ask anything about onboarding..."
                className="flex-1 px-4 py-3 border border-gray-400 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:outline-none text-black placeholder-slate-500"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="px-6 py-3 bg-DivuLightGreen border-black
                 text-black font-medium rounded-lg hover:bg-DivuBlue hover:text-white
                  transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
              >
                Send
              </button>
            </div>
          </div>
        </div>
    </AppLayout>
  );
}
