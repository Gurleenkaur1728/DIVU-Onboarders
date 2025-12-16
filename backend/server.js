import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import remindersRouter from "./routes/reminder.js";
import dotenv from "dotenv";
import OpenAI from "openai";
import { Groq } from "groq-sdk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
// In production (Railway), env vars are injected directly
// In development, load from parent directory's .env file
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
}

const app = express();

// Configure CORS to allow Vercel frontend
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174', 
    'http://localhost:5175',
    'https://divu-onboarders-gurleenkaur1728s-projects.vercel.app',
    'https://divu-onboarders.vercel.app'
  ],
  credentials: true
}));
app.use(express.json());

// Initialize OpenAI client
if (!process.env.OPENAI_API_KEY) {
  console.warn("⚠️  WARNING: OPENAI_API_KEY not found in environment variables!");
  console.warn("   AI summary and quiz generation will not work.");
  console.warn("   Please add OPENAI_API_KEY to your .env file");
}

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-startup',
});

// Initialize Groq client for chatbot
if (!process.env.GROQ_API_KEY) {
  console.warn("⚠️  WARNING: GROQ_API_KEY not found in environment variables!");
  console.warn("   Chatbot functionality will be limited.");
}

const groq = process.env.GROQ_API_KEY 
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

// Load vector store for chatbot
let vectorStore = [];
try {
  const vectorStorePath = path.join(__dirname, "vectorstore.json");
  if (fs.existsSync(vectorStorePath)) {
    vectorStore = JSON.parse(fs.readFileSync(vectorStorePath, "utf8"));
    console.log("✅ Vector store loaded successfully");
  }
} catch (err) {
  console.warn("⚠️ Vector store not found. Chatbot will have limited functionality.");
}

// Helper function for chatbot - cosine similarity
function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magA * magB);
}

// Helper function to find relevant context
async function findRelevantContext(query) {
  // Load all knowledge files directly
  const knowledgeDir = path.join(__dirname, "knowledge");
  let allContent = "";
  
  try {
    const files = fs.readdirSync(knowledgeDir);
    for (const file of files) {
      const filePath = path.join(knowledgeDir, file);
      const content = fs.readFileSync(filePath, "utf8");
      allContent += `\n\n=== ${file} ===\n${content}`;
    }
    return allContent;
  } catch (err) {
    console.error("Error loading knowledge:", err);
    return "I'm having trouble accessing the knowledge base right now.";
  }
}

// Routes
app.use("/api/reminders", remindersRouter);

// AI Summary endpoint
app.post("/api/ai/summary", async (req, res) => {
  try {
    // Check if OpenAI is configured
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ 
        error: "AI service not configured",
        message: "OPENAI_API_KEY is not set in environment variables" 
      });
    }

    const { summary, selectedEmployee, timeRange, stats, charts, employeeCount, context } = req.body;

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
        ${employeeCount ? `Employee Count: ${employeeCount}` : ""}
        ${context ? `Context: ${context}` : ""}

        Data:
        ${JSON.stringify(summary || stats || {}, null, 2)}
        ${charts ? `Charts Data: ${JSON.stringify(charts, null, 2)}` : ""}
        `;

    const completion = await openaiClient.chat.completions.create({
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
    console.error("Error details:", err.message);
    res.status(500).json({ 
      error: "AI summary generation failed.",
      message: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// AI Quiz Generation endpoint
app.post("/api/ai/generate-quiz", async (req, res) => {
  try {
    // Check if OpenAI is configured
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ 
        error: "AI service not configured",
        message: "OPENAI_API_KEY is not set in environment variables" 
      });
    }

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

    const completion = await openaiClient.chat.completions.create({
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

// Chatbot endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Load knowledge content
    const context = await findRelevantContext(message);
    
    // Simple keyword-based responses as fallback if OpenAI fails
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes("divu") && (lowerMsg.includes("what") || lowerMsg.includes("about"))) {
      return res.json({ 
        reply: "DIVU is an employee onboarding platform designed to help new employees seamlessly integrate into the company. DIVU provides digital onboarding modules, checklists, progress tracking, AI assistance, and more to welcome and support new employees from day one."
      });
    }
    
    if (lowerMsg.includes("value") || lowerMsg.includes("culture")) {
      return res.json({ 
        reply: "Our company values are:\n\n1. **Teamwork** - Collaborate and support each other\n2. **Integrity** - Honesty and transparency\n3. **Innovation** - Creative ideas and better ways of working\n4. **Respect** - Fairness and dignity for all\n5. **Continuous Learning** - Training and development opportunities\n\nWe focus on creating a positive, inclusive work environment where employees maintain work-life balance."
      });
    }
    
    if (lowerMsg.includes("module")) {
      return res.json({ 
        reply: "Modules are interactive learning units in DIVU that include:\n- Company Overview (mission, vision, values)\n- Workplace Safety (security, emergency procedures)\n- Company Culture (core values, collaboration)\n- Job-Specific Training (role skills and tools)\n- HR Policies (leave, benefits, code of conduct)\n- Technology & Tools (software and systems)\n\nEach module has learning content, quizzes, progress tracking, and certificates upon completion."
      });
    }
    
    if (lowerMsg.includes("onboard") || lowerMsg.includes("step")) {
      return res.json({ 
        reply: "The onboarding process includes:\n\n1. **Profile Setup** - Update basic details in Account section\n2. **Submit Documents** - Upload ID, bank details, employment forms\n3. **Complete Modules** - Company overview, safety, culture, job training\n4. **Attend Events** - Scheduled orientation sessions\n5. **Ask Questions** - Use Questions section or AI Assistant\n\nOnce complete, you'll receive a digital certificate!"
      });
    }

    // Try OpenAI if available (will fail gracefully if quota exceeded)
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OpenAI not configured");
      }

      const systemPrompt = `You are a helpful AI assistant for DIVU's employee onboarding system. 
Use the following context from our knowledge base to answer questions accurately and professionally.

Context:
${context}`;

      const completion = await openaiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const reply = completion.choices?.[0]?.message?.content?.trim();
      if (reply) {
        return res.json({ reply });
      }
    } catch (apiError) {
      console.log("OpenAI unavailable, using fallback responses");
    }

    // Generic fallback
    res.json({ 
      reply: "I can help you with questions about DIVU, company values, modules, onboarding steps, policies, and more. Could you please rephrase your question or ask about one of these topics?"
    });

  } catch (err) {
    console.error("❌ Chatbot error:", err);
    res.status(500).json({ 
      error: "Failed to process chat message.",
      details: err.message 
    });
  }
});

app.get("/", (req, res) => {
  res.send("Backend is running.");
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`✅ AI Summary API available at /api/ai/summary`);
  console.log(`✅ AI Quiz Generator available at /api/ai/generate-quiz`);
  console.log(`✅ Chatbot API available at /api/chat`);
  console.log(`✅ Reminders API available at /api/reminders`);
});
