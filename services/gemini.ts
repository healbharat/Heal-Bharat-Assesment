import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Question, EvaluationResult } from "../types";

// ✔ Correct way to load env variables in Vite
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ Missing Gemini API Key! Add VITE_GEMINI_API_KEY in Render Environment.");
}

const ai = new GoogleGenAI({ apiKey });

/**
 * Generate AI Questions
 */
export const generateQuestions = async (
  topic: string,
  difficulty: string,
  count: number = 3
): Promise<Question[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate ${count} interview questions on "${topic}".
      Difficulty: ${difficulty}. Return ONLY JSON.`,
      config: {
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text);
  } catch (err) {
    console.error("❌ Error generating questions:", err);
    return [
      { id: "1", text: "Tell me about yourself.", difficulty: "Easy" },
      { id: "2", text: "Why should we hire you?", difficulty: "Medium" },
      { id: "3", text: "Describe a challenge you solved.", difficulty: "Hard" },
    ];
  }
};


/**
 * Evaluate Recorded Audio
 */
export const evaluateAnswer = async (
  question: Question,
  audioBase64: string,
  mimeType: string
): Promise<EvaluationResult> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            text: `Evaluate this answer for question: "${question.text}". 
            Provide clarity, confidence, grammar, and score out of 100. 
            Return ONLY JSON.`,
          },
          {
            inlineData: {
              mimeType,
              data: audioBase64,
            },
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
      },
    });

    const data = JSON.parse(response.text);
    data.questionId = question.id;
    return data;
  } catch (err) {
    console.error("❌ Evaluation Error:", err);
    throw err;
  }
};
