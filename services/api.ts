// services/api.ts
import type { Question, EvaluationResult } from "../types";

const BASE_URL = import.meta.env.VITE_BACKEND_URL || "";

/**
 * Generate questions (Dictation + Verbal)
 */
export const generateQuestions = async (
  topic: string,
  difficulty: string,
  count: number = 3
): Promise<Question[]> => {
  try {
    const resp = await fetch(`${BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, difficulty, count }),
    });

    if (!resp.ok) throw new Error("Backend /generate failed");

    return await resp.json(); // backend returns questions[]
  } catch (err) {
    console.error("❌ Question API Error:", err);
    return [
      {
        id: "fallback-1",
        text: "Tell me about yourself.",
        difficulty: "Easy",
      },
      {
        id: "fallback-2",
        text: "What are your strengths?",
        difficulty: "Medium",
      },
      {
        id: "fallback-3",
        text: "Describe a challenge you overcame.",
        difficulty: "Hard",
      },
    ];
  }
};

/**
 * Evaluate a single answer
 */
export const evaluateAnswer = async (
  question: Question,
  audioBase64: string,
  mimeType: string
): Promise<EvaluationResult> => {
  try {
    const resp = await fetch(`${BASE_URL}/api/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        audioBase64,
        mimeType,
      }),
    });

    if (!resp.ok) throw new Error("Backend /evaluate failed");

    const json = await resp.json();
    return json.result; // backend returns { result }
  } catch (err) {
    console.error("❌ Evaluation API Error:", err);
    throw err;
  }
};
