import fs from "fs";
import path from "path";

const knowledgeDir = path.join(process.cwd(), "knowledge");
const outputFile = "knowledge.json";

function chunkText(text, size = 400) {
  const words = text.split(" ");
  const chunks = [];

  for (let i = 0; i < words.length; i += size) {
    chunks.push(words.slice(i, i + size).join(" "));
  }

  return chunks;
}

function loadKnowledge() {
  const files = fs.readdirSync(knowledgeDir);

  const allChunks = [];

  for (const file of files) {
    const filePath = path.join(knowledgeDir, file);
    const content = fs.readFileSync(filePath, "utf8");

    console.log("Processing:", file);

    const chunks = chunkText(content);

    chunks.forEach((chunk, index) => {
      allChunks.push({
        file,
        index,
        text: chunk,
      });
    });
  }

  fs.writeFileSync(outputFile, JSON.stringify(allChunks, null, 2));

  console.log("✅ Knowledge saved to knowledge.json");
}

loadKnowledge();
