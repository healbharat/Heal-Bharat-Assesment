// BACKEND VERSION OF GEMINI SERVICE
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Question, EvaluationResult } from "../types";

// Get API Key safely (Render → Environment Variable `API_KEY`)
const ai = new GoogleGenAI({
  apiKey: process.env.API_KEY || ""
});

/* -------------------------------------------------------
   TEXT → SPEECH (Dictation Audio Generation)
------------------------------------------------------- */
export const speakText = async (text: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (err) {
    console.error("TTS Error:", err);
    return null;
  }
};

/* -------------------------------------------------------
   GENERATE INTERVIEW QUESTIONS (Dictation + Verbal)
------------------------------------------------------- */
export const generateQuestions = async (
  topic: string,
  difficulty: string,
  count: number = 3
): Promise<Question[]> => {
  try {
    /* ---------- 1. DICTATION SENTENCES ---------- */
    const dictationPrompt = `
      Generate 3 challenging dictation sentences.
      Topic: ${topic}, Difficulty: ${difficulty}.
      Return ONLY JSON array of strings.
    `;

    const dictResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: dictationPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const dictationTexts = JSON.parse(dictResponse.text || "[]");

    const dictationQuestions: Question[] = [];

    for (let i = 0; i < dictationTexts.length; i++) {
      const audio = await speakText(dictationTexts[i]);
      dictationQuestions.push({
        id: `dict-${i}`,
        type: "DICTATION",
        text: dictationTexts[i],
        difficulty: "Medium",
        audioBase64: audio || ""
      });
    }

    /* ---------- 2. VERBAL QUESTIONS ---------- */
    const verbalPrompt = `
      Generate ${count} verbal interview questions for internship.
      Topic: ${topic}, Difficulty: ${difficulty}
      Return JSON array with: { id, text, difficulty }
    `;

    const verbalResp = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: verbalPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              text: { type: Type.STRING },
              difficulty: { type: Type.STRING }
            },
            required: ["id", "text", "difficulty"]
          }
        }
      }
    });

    const verbalQuestions = JSON.parse(verbalResp.text || "[]")
      .map((q: any) => ({ ...q, type: "VERBAL" }));

    return [...dictationQuestions, ...verbalQuestions];

  } catch (error) {
    console.error("❌ Question Generation Error:", error);

    return [
      {
        id: "fallback-d1",
        type: "DICTATION",
        text: "The quick brown fox jumps over the lazy dog.",
        difficulty: "Easy",
      },
      {
        id: "fallback-v1",
        type: "VERBAL",
        text: "Tell me about yourself.",
        difficulty: "Easy",
      }
    ];
  }
};

/* -------------------------------------------------------
   AUDIO EVALUATION (Speech-to-Score)
------------------------------------------------------- */
export const evaluateAnswer = async (
  question: Question,
  audioBase64: string,
  mimeType: string = "audio/webm"
): Promise<EvaluationResult> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            text: `
              Evaluate this answer for the question: "${question.text}".
              Provide:
              - transcription
              - clarity.score & reasoning
              - confidence.score & reasoning
              - grammarAndFluency.score & reasoning
              - contentQuality.score & reasoning
              - overallScore (0-100)
              - keyTakeaways[]
              - improvementTips[]
              Return ONLY JSON.
            `
          },
          {
            inlineData: {
              mimeType,
              data: audioBase64
            }
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcription: { type: Type.STRING },
            overallScore: { type: Type.NUMBER },
            clarity: { type: Type.OBJECT },
            confidence: { type: Type.OBJECT },
            grammarAndFluency: { type: Type.OBJECT },
            contentQuality: { type: Type.OBJECT },
            keyTakeaways: { type: Type.ARRAY },
            improvementTips: { type: Type.ARRAY }
          },
          required: [
            "transcription",
            "overallScore",
            "clarity",
            "confidence",
            "grammarAndFluency",
            "contentQuality",
            "keyTakeaways",
            "improvementTips"
          ]
        }
      }
    });

    const result = JSON.parse(response.text);
    result.questionId = question.id;
    return result;
  } catch (error) {
    console.error("❌ Evaluation Error:", error);
    throw error;
  }
};
