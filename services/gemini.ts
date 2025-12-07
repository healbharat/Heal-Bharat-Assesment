import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Question, EvaluationResult } from "../types";

// Load API Key from Vite Environment
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

// If missing key, show error in console
if (!apiKey) {
  console.error("❌ Missing Gemini API Key! Add VITE_GEMINI_API_KEY in Render Environment.");
}

// Initialize Gemini Client
const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Generate Interview Questions
 */
export const generateQuestions = async (
  topic: string,
  difficulty: string,
  count: number = 3
): Promise<Question[]> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Generate ${count} interview questions.
      Topic: ${topic}
      Difficulty: ${difficulty}
      Return ONLY JSON array:
      [{ "id": "1", "text": "question text", "difficulty": "Easy" }]
    `;

    const result = await model.generateContent(prompt);

    return JSON.parse(result.response.text());
  } catch (err) {
    console.error("❌ Error generating questions:", err);

    return [
      { id: "1", text: "Tell me about yourself.", difficulty: "Easy" },
      { id: "2", text: "Why should we hire you?", difficulty: "Medium" },
      { id: "3", text: "Describe a difficult situation you handled.", difficulty: "Hard" },
    ];
  }
};

/**
 * Evaluate Audio Answer
 */
export const evaluateAnswer = async (
  question: Question,
  audioBase64: string,
  mimeType: string
): Promise<EvaluationResult> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Evaluate the spoken answer for the interview question: "${question.text}".
      Analyze:
      - clarity
      - confidence
      - grammar
      - content quality
      Score out of 100.
      Return ONLY valid JSON:
      {
        "transcription": "",
        "overallScore": 0,
        "clarity": { "score": 0, "reasoning": "" },
        "confidence": { "score": 0, "reasoning": "" },
        "grammarAndFluency": { "score": 0, "reasoning": "" },
        "contentQuality": { "score": 0, "reasoning": "" },
        "keyTakeaways": [],
        "improvementTips": []
      }
    `;

    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType,
          data: audioBase64,
        },
      },
    ]);

    const parsed = JSON.parse(result.response.text());
    parsed.questionId = question.id;

    return parsed;
  } catch (err) {
    console.error("❌ Evaluation Error:", err);
    throw err;
  }
};
