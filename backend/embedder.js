import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { Groq } from "groq-sdk";

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function embedText(text) {
  const response = await groq.embeddings.create({
    model: "nomic-embed",
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
