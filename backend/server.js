
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Generate questions
app.post("/api/questions", async (req, res) => {
  try {
    const { topic, difficulty } = req.body;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(
      `Generate 3 interview questions for topic "${topic}". Difficulty: ${difficulty}. Return clean JSON array.`
    );

    res.json(JSON.parse(result.response.text()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed generating questions" });
  }
});

// Evaluate answer
app.post("/api/evaluate", async (req, res) => {
  try {
    const { question, audioBase64, mimeType } = req.body;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Evaluate interview answer for: "${question.text}". Return JSON with scoring and feedback.`
            },
            {
              inlineData: {
                mimeType,
                data: audioBase64
              }
            }
          ]
        }
      ]
    });

    res.json(JSON.parse(result.response.text()));
  } catch (err) {
    console.error("Eval error:", err);
    res.status(500).json({ error: "Evaluation failed" });
  }
});

app.listen(5000, () => console.log("Backend started on port 5000"));
