import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Question, EvaluationResult } from "../types";

// ------------------------------
// 🔐 Load Gemini API Key correctly (Vite standard)
// ------------------------------
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ Missing Gemini API Key! Add VITE_GEMINI_API_KEY in Render Environment.");
}

const ai = new GoogleGenAI({ apiKey });

/* -----------------------------------------
   ✅ Generate AI Questions
------------------------------------------- */
export const generateQuestions = async (
  topic: string,
  difficulty: string,
  count: number = 3
): Promise<Question[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Generate ${count} interview questions on: "${topic}".
                     Difficulty: ${difficulty}.
                     Return STRICT JSON array.`
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
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

/* -----------------------------------------
   ✅ Evaluate Recorded Audio (MOST IMPORTANT FIX)
------------------------------------------- */
export const evaluateAnswer = async (
  question: Question,
  audioBase64: string,
  mimeType: string
): Promise<EvaluationResult> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Evaluate the candidate's audio response for the question:
                     "${question.text}".
                     
                     Analyze:
                     - Clarity
                     - Confidence
                     - Grammar
                     - Content Quality

                     Give total score (0–100) + feedback.
                     Return STRICT JSON.`
            },
            {
              inlineData: {
                mimeType,
                data: audioBase64
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const parsed = JSON.parse(response.text);
    parsed.questionId = question.id;
    return parsed;
  } catch (err) {
    console.error("❌ Evaluation Error:", err);
    throw err;
  }
};
