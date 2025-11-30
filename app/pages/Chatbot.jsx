import { useState } from "react";
import axios from "axios";
import AppLayout from "../../src/AppLayout.jsx";

export default function Chatbot() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const response = await axios.post("http://localhost:8080/chat", {
      message: input,
    });

    setMessages((prev) => [
      ...prev,
      { from: "user", text: input },
      { from: "bot", text: response.data.reply },
    ]);

    setInput("");
  };

  return (
    <AppLayout>
      <div className="flex flex-col items-center p-6 min-h-screen bg-emerald-50">

        <h1 className="text-3xl font-bold text-emerald-900 mb-6">
          AI Assistant
        </h1>

        <div className="w-full max-w-xl bg-white rounded-xl shadow-lg border p-4 flex flex-col">

          <div className="flex-1 h-[400px] overflow-y-auto border rounded-md p-3 mb-3">
            {messages.map((m, i) => (
              <div key={i} className="mb-3">
                <p className="font-bold text-emerald-800">
                  {m.from === "user" ? "You:" : "Assistant:"}
                </p>
                <p className="text-emerald-900">{m.text}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border rounded-md focus:ring-2 ring-emerald-400"
            />

            <button
              onClick={sendMessage}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
