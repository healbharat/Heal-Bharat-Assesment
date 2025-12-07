// backend/server.js
import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch"; // node 18+ has fetch built-in, but node-fetch works fine
import cors from "cors";

const PORT = process.env.PORT || 5000;
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("Missing GEMINI_API_KEY in environment. Add it to Render / .env for local dev.");
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "15mb" }));

/**
 * Simple text generation proxy
 * body: { prompt: string, model?: string }
 */
app.post("/api/generate", async (req, res) => {
  try {
    const { prompt, model = "text-bison-001" } = req.body;
    if (!prompt) return res.status(400).json({ error: "prompt required" });

    const endpoint = `https://generativelanguage.googleapis.com/v1beta2/models/${model}:generate?key=${API_KEY}`;

    const body = {
      prompt: {
        text: prompt
      },
      // adjust temperature / maxOutputTokens as needed
      temperature: 0.2,
      maxOutputTokens: 512
    };

    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const json = await r.json();
    if (!r.ok) {
      console.error("GenAI Error:", json);
      return res.status(500).json({ error: json });
    }

    // The API returns structured fields; this returns the text output
    const out = (json?.candidates?.[0]?.content?.text || json?.output?.[0]?.content?.text || "");
    return res.json({ text: out, raw: json });
  } catch (err) {
    console.error("Server /generate error:", err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * Basic evaluate endpoint — for now returns a best-effort evaluation.
 * We accept question + base64 audio; for a production-grade solution use
 * a speech-to-text service + text scoring. Here we call the same text model with instructions.
 *
 * body:
 *  { question: { id, text }, audioBase64: string, mimeType: string }
 */
app.post("/api/evaluate", async (req, res) => {
  try {
    const { question, audioBase64, mimeType } = req.body;
    if (!question || !audioBase64) return res.status(400).json({ error: "question and audioBase64 required" });

    // NOTE: Inline audio evaluation is complex with REST; simplest robust approach:
    // 1) Use a speech-to-text API to transcribe audio (Google Speech-to-Text).
    // 2) Send transcription + instructions to the text model for scoring.
    //
    // For quick testing (to stop the frontend failing), do a "mock" transcription:
    // - Return a placeholder transcription and ask text model to evaluate it.
    // Replace the mock below with real transcription integration later.

    const mockTranscription = "TRANSCRIPTION_NOT_AVAILABLE_IN_PROXY - please integrate Speech-to-Text";

    // Build instruction prompt for scoring
    const prompt = `
You are an expert communications coach. A candidate answered:
"${mockTranscription}"

Evaluate the answer for the question: "${question.text}".
Return JSON with keys:
{ questionId, transcription, overallScore (0-100), clarity: { score, reasoning }, confidence: { score, reasoning },
contentQuality: { score, reasoning }, grammarAndFluency: { score, reasoning }, keyTakeaways: [..], improvementTips: [..] }
Return valid JSON only.
`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generate?key=${API_KEY}`;
    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: { text: prompt },
        temperature: 0.2,
        maxOutputTokens: 512
      })
    });

    const json = await r.json();
    if (!r.ok) {
      console.error("GenAI evaluate error:", json);
      return res.status(500).json({ error: json });
    }

    // text output is in json.candidates[0].content.text or output. Try to extract:
    const rawText = json?.candidates?.[0]?.content?.text || json?.output?.[0]?.content?.text || "";
    // Try parse JSON - if fails, return raw text for debugging
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (err) {
      console.warn("Could not parse JSON from model output; returning model text as fallback.", rawText);
      // Fallback: return a simple structure
      parsed = {
        questionId: question.id,
        transcription: mockTranscription,
        overallScore: 0,
        clarity: { score: 0, reasoning: rawText },
        confidence: { score: 0, reasoning: rawText },
        contentQuality: { score: 0, reasoning: rawText },
        grammarAndFluency: { score: 0, reasoning: rawText },
        keyTakeaways: [],
        improvementTips: []
      };
    }

    // Ensure required fields
    parsed.questionId = question.id;
    parsed.transcription = parsed.transcription || mockTranscription;

    return res.json({ result: parsed, raw: json });
  } catch (err) {
    console.error("Server /evaluate error:", err);
    return res.status(500).json({ error: String(err) });
  }
});

// simple health
app.get("/api/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Backend proxy listening on ${PORT}`);
});
