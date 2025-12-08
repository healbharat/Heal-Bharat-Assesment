
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Question, EvaluationResult } from "../types";

// Helper to get API key safely
const getApiKey = () => process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey: getApiKey() });

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
 * Generates a list of interview questions based on topic and difficulty.
 * Updated to include 3 Dictation Questions followed by Verbal Questions.
 */
export const generateQuestions = async (topic: string, difficulty: string, count: number = 3): Promise<Question[]> => {
  try {
    // 1. Generate Dictation Sentences (Word Play)
    const dictationPrompt = `Generate 3 complex sentences for a listening skills test. 
    Topic: ${topic}. Difficulty: ${difficulty}.
    The sentences should be professional but challenging (e.g., specific terminology or tongue twisters).
    Return ONLY a JSON array of strings. Example: ["Sentence 1", "Sentence 2", "Sentence 3"]`;

    const dictationResponse = await ai.models.generateContent({
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
    
    const dictationTexts = JSON.parse(dictationResponse.text || "[]") as string[];

    // 2. Generate Audio for Dictation Sentences
    const dictationQuestions: Question[] = [];
    for (let i = 0; i < dictationTexts.length; i++) {
        const audio = await speakText(dictationTexts[i]);
        if (audio) {
            dictationQuestions.push({
                id: `dict-${i}`,
                type: 'DICTATION',
                text: dictationTexts[i],
                difficulty: 'Hard',
                audioBase64: audio
            });
        }
    }

    // 3. Generate Verbal Questions
    const verbalCount = count; // Keep original count for verbal
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate ${verbalCount} interview questions for an intern position focusing on "${topic}". 
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

    const verbalTexts = JSON.parse(response.text || "[]") as any[];
    const verbalQuestions: Question[] = verbalTexts.map((q: any) => ({
        ...q,
        type: 'VERBAL'
    }));

    // Combine: Dictation First, then Verbal
    return [...dictationQuestions, ...verbalQuestions];

  } catch (error) {
    console.error("Error generating questions:", error);
    // Fallback questions if API fails
    return [
      { id: 'd1', type: 'DICTATION', text: "The quick brown fox jumps over the lazy dog.", difficulty: 'Easy' },
      { id: '1', type: 'VERBAL', text: "Tell me about a time you handled a difficult situation.", difficulty: 'Medium' }
    ];
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

