import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Question, EvaluationResult } from "../types";

// Helper to get API key safely
const getApiKey = () => process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey: getApiKey() });

/**
 * Generates a list of interview questions based on topic and difficulty.
 */
export const generateQuestions = async (topic: string, difficulty: string, count: number = 3): Promise<Question[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate ${count} interview questions for an intern position focusing on "${topic}". 
      Difficulty level: ${difficulty}. 
      The questions should assess verbal communication skills, critical thinking, and professional demeanor.
      Return the response in JSON format.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              text: { type: Type.STRING },
              difficulty: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard'] },
              context: { type: Type.STRING },
            },
            required: ["id", "text", "difficulty"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No data returned from Gemini");
    return JSON.parse(text) as Question[];
  } catch (error) {
    console.error("Error generating questions:", error);
    // Fallback questions if API fails
    return [
      { id: '1', text: "Tell me about a time you handled a difficult situation.", difficulty: 'Medium' },
      { id: '2', text: "Why do you want to work in this industry?", difficulty: 'Easy' },
      { id: '3', text: "Describe a project where you had to work in a team.", difficulty: 'Medium' }
    ];
  }
};

/**
 * Converts text to speech using Gemini TTS.
 */
export const speakText = async (text: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
};

/**
 * Analyzes the user's audio answer.
 */
export const evaluateAnswer = async (
  question: Question,
  audioBase64: string,
  mimeType: string = 'audio/wav'
): Promise<EvaluationResult> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            text: `You are an expert communication coach. Evaluate the following audio answer for the interview question: "${question.text}".
            Analyze the speech for clarity, confidence, content quality, and grammar.
            Provide a strict numerical score (0-100) and constructive feedback.
            Transcribe the audio accurately.
            
            Return the result in JSON.`
          },
          {
            inlineData: {
              mimeType: mimeType, // e.g., 'audio/webm' or 'audio/wav'
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
            questionId: { type: Type.STRING },
            transcription: { type: Type.STRING },
            overallScore: { type: Type.NUMBER },
            clarity: {
              type: Type.OBJECT,
              properties: { score: { type: Type.NUMBER }, reasoning: { type: Type.STRING } }
            },
            confidence: {
              type: Type.OBJECT,
              properties: { score: { type: Type.NUMBER }, reasoning: { type: Type.STRING } }
            },
            contentQuality: {
              type: Type.OBJECT,
              properties: { score: { type: Type.NUMBER }, reasoning: { type: Type.STRING } }
            },
            grammarAndFluency: {
              type: Type.OBJECT,
              properties: { score: { type: Type.NUMBER }, reasoning: { type: Type.STRING } }
            },
            keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvementTips: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["overallScore", "clarity", "confidence", "transcription", "keyTakeaways", "improvementTips"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No evaluation returned");
    const result = JSON.parse(text);
    // Ensure the ID matches
    result.questionId = question.id;
    return result as EvaluationResult;
  } catch (error) {
    console.error("Evaluation Error:", error);
    throw error;
  }
};