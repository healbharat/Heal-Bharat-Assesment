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
// services/gemini.ts (frontend) - lightweight proxy client
export const generateQuestions = async (topic: string, difficulty: string, count = 3) => {
  try {
    const prompt = `Generate ${count} interview questions for an intern position focusing on "${topic}". Difficulty: ${difficulty}. Return JSON array of objects: { id, text, difficulty }. Return JSON ONLY.`;
    const resp = await fetch(`${import.meta.env.VITE_BACKEND_URL || ""}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, model: "text-bison-001" })
    });

    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Backend generate failed: ${txt}`);
    }
    const json = await resp.json();
    // backend returns { text, raw }
    let text = json.text || "";
    // try parse
    try {
      const parsed = JSON.parse(text);
      return parsed;
    } catch {
      // if model returned plain text list, try to fallback
      // return fallback sample
      console.warn("Could not parse model JSON, using fallback questions.");
      return [
        { id: "1", text: "Tell me about yourself.", difficulty: "Easy" },
        { id: "2", text: "Why do you want this internship?", difficulty: "Medium" },
        { id: "3", text: "Describe a team project you worked on.", difficulty: "Medium" }
      ];
    }
  } catch (err) {
    console.error("Error generating questions:", err);
    return [
      { id: "1", text: "Tell me about yourself.", difficulty: "Easy" },
      { id: "2", text: "Why do you want this internship?", difficulty: "Medium" },
      { id: "3", text: "Describe a team project you worked on.", difficulty: "Medium" }
    ];
  }
};

export const evaluateAnswer = async (question: any, audioBase64: string, mimeType = "audio/webm") => {
  try {
    const resp = await fetch(`${import.meta.env.VITE_BACKEND_URL || ""}/api/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, audioBase64, mimeType })
    });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Backend evaluate failed: ${txt}`);
    }
    const json = await resp.json();
    // backend returns { result, raw }
    return json.result;
  } catch (err) {
    console.error("Evaluation Error:", err);
    throw err;
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
