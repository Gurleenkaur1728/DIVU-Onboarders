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

app.post("/api/ai/generate-quiz", async (req, res) => {
  try {
    const { moduleContent, questionCount = 10 } = req.body;

    const prompt = `
You are an expert instructional designer. Generate ${questionCount} quiz questions based on the following module content.

Module Content:
${moduleContent}

Generate a diverse set of quiz questions with the following distribution:
- 60% Multiple Choice (single correct answer)
- 20% Multiple Select (multiple correct answers)
- 10% True/False
- 10% Fill in the Blank

For each question, provide:
1. Question text
2. Question type (multiple-choice, multiple-select, true-false, or fill-blank)
3. Options (for multiple-choice and multiple-select)
4. Correct answer(s)
5. Points (10 points for easy, 15 for medium, 20 for hard)
6. Explanation (why the answer is correct)

Return ONLY a valid JSON array in this exact format, no additional text:
[
  {
    "type": "multiple-choice",
    "question": "What is...?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "points": 10,
    "explanation": "This is correct because..."
  },
  {
    "type": "multiple-select",
    "question": "Select all that apply...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswers": [0, 2],
    "points": 15,
    "explanation": "Options A and C are correct because..."
  },
  {
    "type": "true-false",
    "question": "Statement is true?",
    "correctAnswer": true,
    "points": 10,
    "explanation": "This is true because..."
  },
  {
    "type": "fill-blank",
    "question": "The capital of France is ___",
    "correctAnswer": "Paris",
    "points": 10,
    "explanation": "Paris is the capital city of France."
  }
]

Make questions clear, relevant, and based on the actual content provided.
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const output = completion.choices?.[0]?.message?.content?.trim();
    
    // Parse JSON response
    let questions;
    try {
      // Remove markdown code blocks if present
      const jsonText = output.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      questions = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("Failed to parse AI response:", output);
      throw new Error("Invalid JSON response from AI");
    }

    // Add unique IDs to questions
    const questionsWithIds = questions.map(q => ({
      id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...q
    }));

    res.json({ questions: questionsWithIds });
  } catch (err) {
    console.error("❌ AI quiz generation failed:", err);
    res.status(500).json({ 
      error: "AI quiz generation failed.",
      details: err.message 
    });
  }
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`AI Summary API running on port ${PORT}`));
