/**
 * ------------------------------------------------------------
 *  FRONTEND GEMINI SERVICE (SAFE)
 *  - No API Key on Frontend
 *  - Uses Backend Proxy Endpoints:
 *        POST /api/generate
 *        POST /api/evaluate
 *  - 100% Render + Vite Compatible
 * ------------------------------------------------------------
 */

import type { Question, EvaluationResult } from "../types";

/**
 * Generate Interview Questions from Backend (Proxy)
 */
export const generateQuestions = async (
  topic: string,
  difficulty: string,
  count: number = 3
): Promise<Question[]> => {
  try {
    const prompt = `
      Generate ${count} interview questions for an intern role about "${topic}".
      Difficulty: ${difficulty}.
      Return ONLY JSON array: [{ "id": "", "text": "", "difficulty": "" }]
    `;

    const resp = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!resp.ok) {
      throw new Error(await resp.text());
    }

    const data = await resp.json(); // backend returns { text, raw }
    const text = data.text || "";

    // Try parsing JSON
    try {
      return JSON.parse(text);
    } catch {
      console.warn("⚠ Invalid JSON returned. Using fallback.");
      return [
        { id: "1", text: "Tell me about yourself.", difficulty: "Easy" },
        { id: "2", text: "Why are you applying for this internship?", difficulty: "Medium" },
        { id: "3", text: "Describe a project you worked on.", difficulty: "Medium" }
      ];
    }
  } catch (err) {
    console.error("❌ Question Generation Error:", err);
    return [
      { id: "1", text: "Tell me about yourself.", difficulty: "Easy" },
      { id: "2", text: "Why should we hire you?", difficulty: "Medium" },
      { id: "3", text: "Describe a challenge you solved.", difficulty: "Hard" }
    ];
  }
};

/**
 * Evaluate Audio Answer via Backend (Proxy)
 */
export const evaluateAnswer = async (
  question: Question,
  audioBase64: string,
  mimeType: string = "audio/webm"
): Promise<EvaluationResult> => {
  try {
    const resp = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        audioBase64,
        mimeType
      }),
    });

    if (!resp.ok) {
      throw new Error(await resp.text());
    }

    const data = await resp.json(); // backend returns { result, raw }
    const result = data.result;

    result.questionId = question.id; // attach QID

    return result as EvaluationResult;
  } catch (err) {
    console.error("❌ Evaluation Error:", err);
    throw err;
  }
};
