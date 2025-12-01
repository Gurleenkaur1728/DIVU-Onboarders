import express from "express";
import cors from "cors";
import remindersRouter from "./routes/reminder.js";
import dotenv from "dotenv";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/reminders", remindersRouter);

app.get("/", (req, res) => {
  res.send("Backend is running.");
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
