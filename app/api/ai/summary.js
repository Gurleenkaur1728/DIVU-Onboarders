import "dotenv/config";
import express from "express";
import OpenAI from "openai";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/api/ai/summary", async (req, res) => {
  try {
    const { summary, selectedEmployee, timeRange } = req.body;

    const prompt = `
        You are an HR analytics assistant for DIVU.
        Summarize the employee onboarding and performance progress below as a professional HR report. 
        Return the result strictly as valid HTML (<div>, <h3>, <ul>, <li>, <strong> tags only).

        Sections to include:
        1. Overview
        2. Trends
        3. Strengths
        4. Areas for Improvement
        5. Recommendations

        Use <h3> for section titles, <ul><li> for lists, and <strong> for key highlights.
        Avoid Markdown, hashtags, or asterisks — output only raw HTML.

        Time range: ${timeRange || "N/A"} days
        ${selectedEmployee ? `Employee: ${selectedEmployee.name}` : "All Employees"}

        Data:
        ${JSON.stringify(summary, null, 2)}
        `;


    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
    });

    const output =
      completion.choices?.[0]?.message?.content?.trim() ||
      "⚠️ No summary generated.";

    res.json({ summary: output });
  } catch (err) {
    console.error("❌ AI summary generation failed:", err);
    res.status(500).json({ error: "AI summary generation failed." });
  }
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`AI Summary API running on port ${PORT}`));
