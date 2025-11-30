import express from "express";
import axios from "axios";
import cors from "cors";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Load pre-chunked knowledge
const knowledge = JSON.parse(fs.readFileSync("knowledge.json", "utf8"));

// Simple similarity scoring
function scoreChunk(chunk, question) {
  const q = question.toLowerCase();
  const t = chunk.text.toLowerCase();

  let score = 0;
  q.split(" ").forEach((word) => {
    if (t.includes(word)) score++;
  });

  return score;
}

app.post("/chat", async (req, res) => {
  const { message } = req.body;

  // 1. Find best chunks (top 3)
  const scored = knowledge
    .map((c) => ({ ...c, score: scoreChunk(c, message) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const context = scored.map((c) => c.text).join("\n\n");

  const systemPrompt = `
You are the DIVU Employee Support Assistant.
Answer ONLY based on the context below.
NEVER guess. If unsure, say "I don’t have this information. Please ask HR."

CONTEXT:
${context}
  `;

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const reply = response.data.choices[0].message.content;
    res.json({ reply });

  } catch (err) {
    console.error("Groq Error:", err.response?.data || err);
    res.status(500).json({ error: "Groq request failed" });
  }
});

app.listen(8080, () =>
  console.log("🔥 Smart RAG chatbot running WITHOUT embeddings")
);
