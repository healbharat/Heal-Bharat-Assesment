import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Question, EvaluationResult } from "../types";

// FIXED: Vite exposes env vars through import.meta.env
const getApiKey = () => {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) {
    console.error("❌ GEMINI API KEY NOT FOUND! Add VITE_GEMINI_API_KEY in Render Environment.");
    return "";
  }
  return key;
};

const apiKey = getApiKey();
const ai = new GoogleGenAI({ apiKey });

/**
 * Generate Questions
 */
export const generateQuestions = async (
  topic: string,
  difficulty: string,
  count: number = 3
): Promise<Question[]> => {
  try {
    if (!apiKey) throw new Error("Missing Gemini API Key.");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate ${count} interview questions for interns about "${topic}".
      Difficulty: ${difficulty}. Output JSON format.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              text: { type: Type.STRING },
              difficulty: { type: Type.STRING },
            },
            required: ["id", "text", "difficulty"],
          },
        },
      },
    });

    const text = response.text;

    if (!text) {
      console.error("⚠ Gemini returned empty response");
      throw new Error("Empty Gemini response");
    }

    return JSON.parse(text);
  } catch (error: any) {
    console.error("❌ Error generating questions:", error);

    return [
      { id: "1", text: "Describe a challenge you solved recently.", difficulty: "Medium" },
      { id: "2", text: "Why do you want this internship?", difficulty: "Easy" },
      { id: "3", text: "How do you handle stressful situations?", difficulty: "Medium" },
    ];
  }
};

/**
 * TEXT → SPEECH
 */
export const speakText = async (text: string): Promise<string | null> => {
  try {
    if (!apiKey) throw new Error("Missing Gemini API Key.");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
};

/**
 * AUDIO EVALUATION
 */
export const evaluateAnswer = async (
  question: Question,
  audioBase64: string,
  mimeType: string
): Promise<EvaluationResult> => {
  try {
    if (!apiKey) throw new Error("Missing Gemini API Key.");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            text: `Evaluate this answer for the question: "${question.text}".
            Score: clarity, confidence, grammar, content. Return JSON only.`
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

    let text = response.text;

    if (!text) throw new Error("Gemini returned no evaluation data.");

    const result = JSON.parse(text);
    result.questionId = question.id;

    return result;
  } catch (error: any) {
    console.error("❌ Evaluation Error:", error);
    throw new Error("Evaluation failed: " + error.message);
  }
};
