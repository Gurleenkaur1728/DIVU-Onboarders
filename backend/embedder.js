import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import OpenAI from "openai";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function embedText(text) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text
  });

  return response.data[0].embedding;
}

async function embedKnowledge() {
  const knowledgeDir = path.join(process.cwd(), "knowledge");
  const files = fs.readdirSync(knowledgeDir);

  const vectorStore = [];

  for (const file of files) {
    const filePath = path.join(knowledgeDir, file);
    const content = fs.readFileSync(filePath, "utf8");

    console.log(`Embedding: ${file}`);

    const embedding = await embedText(content);

    vectorStore.push({
      file,
      content,
      embedding
    });
  }

  fs.writeFileSync("vectorstore.json", JSON.stringify(vectorStore, null, 2));
  console.log("✅ Knowledge embedded and saved to vectorstore.json");
}

embedKnowledge();
