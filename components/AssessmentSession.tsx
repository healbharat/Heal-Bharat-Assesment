import React, { useState, useEffect, useRef } from 'react';
import { Question, EvaluationResult } from '../types';
import { evaluateAnswer } from '../services/gemini';
import { blobToBase64, decodePCM, playAudioBuffer } from '../services/audioUtils';
import Visualizer from './Visualizer';
import { Mic, Loader2, Camera, Eye, ShieldAlert, Play, Type, ArrowRight, Volume2 } from 'lucide-react';

interface AssessmentSessionProps {
  questions: Question[];
  onComplete: (results: EvaluationResult[]) => void;
  onBlock: () => void;
}

const READ_DURATION = 30;
const RECORD_DURATION = 20;

type Phase = 'PREP' | 'RECORDING' | 'PROCESSING' | 'DICTATION_PLAY' | 'DICTATION_TYPE';

const AssessmentSession: React.FC<AssessmentSessionProps> = ({ questions, onComplete, onBlock }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('PREP');
  const [timeLeft, setTimeLeft] = useState(READ_DURATION);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const [warnings, setWarnings] = useState(0);

  // Dictation state
  const [audioPlayed, setAudioPlayed] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const currentQuestion = questions[currentIndex];
  const isDictation = currentQuestion?.type === 'DICTATION';

  /* ============================================
     AUDIO PLAYER — FINAL ROBUST VERSION
  ============================================= */


      /* ---------- TRY #2: decodePCM (RAW PCM fallback) ---------- */
      try {
        console.log("Trying decodePCM fallback...");
        const pcmBuffer = decodePCM(bytes, audioCtx, 24000);
        playAudioBuffer(pcmBuffer, audioCtx, () => {
          setIsPlayingAudio(false);
          setAudioPlayed(true);
          setPhase("DICTATION_TYPE");
        });
        console.log("decodePCM success!");
        return;
      } catch (e) {
        console.warn("decodePCM failed:", e);
      }

      /* ---------- TRY #3: Blob → HTMLAudioElement fallback (ALWAYS WORKS) ---------- */
      try {
        console.log("Trying HTMLAudioElement fallback...");
        const blob = new Blob([bytes], { type: "audio/wav" });
        const url = URL.createObjectURL(blob);

        const audio = new Audio(url);
        audio.onended = () => {
          URL.revokeObjectURL(url);
          setIsPlayingAudio(false);
          setAudioPlayed(true);
          setPhase("DICTATION_TYPE");
        };

        await audio.play();
        console.log("HTMLAudioElement playback success!");
        return;
      } catch (e) {
        console.error("Final fallback failed:", e);
      }

      throw new Error("No playback method succeeded");

    } catch (e) {
      console.error("FINAL AUDIO ERROR:", e);
      alert("Audio failed to play. (Check console logs)");
      setIsPlayingAudio(false);
      setAudioPlayed(true);
    }
  };
  /* ============================================
       SECURITY VIOLATION HANDLER
  ============================================= */

  const handleSecurityViolation = () => {
    setWarnings(prev => {
      const newCount = prev + 1;

      if (newCount === 1) {
        alert("⚠️ WARNING (1/2): You minimized or switched the tab. One more violation will block you.");
      } else if (newCount >= 2) {
        onBlock();
      }

      return newCount;
    });
  };

  /* ============================================
       INIT MEDIA (Camera + Mic)
  ============================================= */

  const initMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });

      setMediaStream(stream);
      mediaStreamRef.current = stream;
    } catch (err) {
      console.error("Media Permission Error:", err);
      alert("Camera + Microphone access required. Please allow permissions.");
    }
  };

  /* ============================================
       INITIALIZATION EFFECT
  ============================================= */

  useEffect(() => {
    initMedia();

    const handleVis = () => {
      if (document.hidden) handleSecurityViolation();
    };

    document.addEventListener("visibilitychange", handleVis);

    return () => {
      document.removeEventListener("visibilitychange", handleVis);
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  /* ============================================
       VIDEO ELEMENT SYNC
  ============================================= */

  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

  /* ============================================
       QUESTION SWITCH HANDLING
  ============================================= */

  useEffect(() => {
    setAudioPlayed(false);
    setTypedAnswer("");
    setIsPlayingAudio(false);

    if (isDictation) {
      setPhase("DICTATION_PLAY");
      setTimeLeft(60);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      startPrepPhase();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex]);

  /* ============================================
       PHASE: PREP → RECORDING TIMER
  ============================================= */

  const startPrepPhase = () => {
    setPhase("PREP");
    setTimeLeft(READ_DURATION);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          startRecordingPhase();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  /* ============================================
       START RECORDING
  ============================================= */

  const startRecordingPhase = () => {
    setPhase("RECORDING");
    setTimeLeft(RECORD_DURATION);

    if (!mediaStreamRef.current) return;

    const mimeType = MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "audio/mp4";

    const recorder = new MediaRecorder(mediaStreamRef.current, { mimeType });

    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = e => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.start();

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          stopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  /* ============================================
       STOP RECORDING
  ============================================= */

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    recorder.stop();
    setPhase("PROCESSING");

    recorder.onstop = async () => {
      const mimeType = recorder.mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: mimeType });
      await processVerbalAnswer(blob, mimeType);
    };
  };

  /* ============================================
       PROCESS VERBAL ANSWER
  ============================================= */

  const processVerbalAnswer = async (audioBlob: Blob, mimeType: string) => {
    try {
      const base64Audio = await blobToBase64(audioBlob);
      const evaluation = await evaluateAnswer(currentQuestion, base64Audio, mimeType);

      handleResult(evaluation);
    } catch (err) {
      console.error("Verbal Evaluation Error:", err);

      const empty: EvaluationResult = {
        questionId: currentQuestion.id,
        transcription: "Audio processing error",
        overallScore: 0,
        clarity: { score: 0, reasoning: "Error" },
        confidence: { score: 0, reasoning: "Error" },
        contentQuality: { score: 0, reasoning: "Error" },
        grammarAndFluency: { score: 0, reasoning: "Error" },
        keyTakeaways: [],
        improvementTips: []
      };

      handleResult(empty);
    }
  };

  /* ============================================
       DICTATION — SUBMIT ANSWER
  ============================================= */

  const submitDictation = () => {
    const target = currentQuestion.text
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");

    const input = typedAnswer
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");

    const tw = target.split(/\s+/);
    const iw = input.split(/\s+/);

    let matches = 0;
    iw.forEach(w => {
      if (tw.includes(w)) matches++;
    });

    let score = Math.round((matches / tw.length) * 100);
    if (score > 100) score = 100;

    const result: EvaluationResult = {
      questionId: currentQuestion.id,
      transcription: typedAnswer,
      overallScore: score,
      clarity: { score: score, reasoning: "Dictation" },
      confidence: { score: score, reasoning: "Dictation" },
      contentQuality: { score: score, reasoning: `Matched ${matches}/${tw.length} words` },
      grammarAndFluency: { score: score, reasoning: "Dictation" },
      keyTakeaways: ["Listening Accuracy"],
      improvementTips: ["Improve listening clarity"]
    };

    handleResult(result);
  };

  /* ============================================
       SHARED RESULT HANDLER
  ============================================= */

  const handleResult = (result: EvaluationResult) => {
    const newList = [...results, result];
    setResults(newList);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      onComplete(newList);
    }
  };
  /* ============================================================
        AUDIO PLAY (DICTATION FIXED VERSION)
     ============================================================ */

  const handlePlayAudio = async () => {
    if (audioPlayed || !currentQuestion.audioBase64) return;

    setIsPlayingAudio(true);

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      // Base64 → Bytes
      const binary = atob(currentQuestion.audioBase64);
      const bytes = new Uint8Array(binary.length);

      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      // Gemini returns RAW PCM → decode manually
      const audioBuffer = decodePCM(bytes, audioCtx, 24000);

      playAudioBuffer(audioBuffer, audioCtx, () => {
        setIsPlayingAudio(false);
        setAudioPlayed(true);
        setPhase("DICTATION_TYPE");
      });

    } catch (err) {
      console.error("Audio Play Error:", err);
      alert("Failed to decode/play the audio.");
      setIsPlayingAudio(false);
      setAudioPlayed(true);
    }
  };


  /* ============================================================
        JSX RETURN (FULL FINAL UI)
     ============================================================ */

  return (
    <div className="max-w-6xl mx-auto w-full px-6 h-full flex flex-col justify-center relative font-sans">

      {/* CAMERA BUBBLE */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="w-32 h-32 rounded-full border-4 border-indigo-600 shadow-2xl overflow-hidden bg-black">
          {mediaStream ? (
            <video ref={videoRef} autoPlay muted className="w-full h-full object-cover scale-x-[-1]" />
          ) : (
            <div className="flex items-center justify-center h-full text-white bg-slate-900">
              <Camera className="w-8 h-8 opacity-50" />
            </div>
          )}
        </div>
        <p className="text-center mt-2 text-xs text-indigo-900 font-bold bg-white px-2 py-1 rounded-full border">
          Live Feed
        </p>
      </div>

      {/* HEADER */}
      <div className="mb-8">
        <div className="flex justify-between items-end mb-4">
          <div>
            <span className={`px-2 py-1 rounded-md text-xs font-bold ${
              isDictation ? "bg-purple-100 text-purple-700" : "bg-indigo-100 text-indigo-600"
            }`}>
              {isDictation ? "Audio Dictation Test" : "Verbal Assessment"}
            </span>

            <h2 className="text-3xl font-extrabold text-slate-900 mt-2">
              Question {currentIndex + 1} / {questions.length}
            </h2>
          </div>

          {/* Warning counter */}
          <div className="flex flex-col items-end">
            <div className="flex text-sm items-center bg-slate-100 px-3 py-1.5 rounded-lg">
              <ShieldAlert className={`w-4 h-4 ${warnings > 0 ? "text-red-500" : "text-slate-400"}`} />
              <span className="ml-2 font-medium">Warnings:  
                <span className={warnings > 0 ? "text-red-600 font-bold ml-1" : "text-green-600 ml-1"}>
                  {warnings}/2
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
          <div
            className={`h-2 ${
              isDictation ? "bg-purple-600" : "bg-indigo-600"
            }`}
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>


      {/* CONDITIONAL RENDER: DICTATION OR VERBAL */}
      {isDictation ? (
        /* ================= DICTATION UI ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">

          {/* LEFT CARD — Audio Play */}
          <div className="bg-white p-8 rounded-3xl border shadow-xl">
            <h3 className="text-xl font-bold mb-4 flex items-center text-purple-700">
              <Volume2 className="w-6 h-6 mr-2" /> Dictation Audio
            </h3>

            <button
              onClick={handlePlayAudio}
              disabled={audioPlayed || isPlayingAudio}
              className={`w-full py-8 rounded-xl border-2 text-lg font-bold transition ${
                audioPlayed ? "bg-slate-100 text-slate-500" :
                "bg-purple-50 text-purple-700 hover:bg-purple-100"
              }`}
            >
              {isPlayingAudio ? "Playing..." : audioPlayed ? "Played" : "Play Audio (One Chance)"}
            </button>
          </div>

          {/* RIGHT CARD — Typing Box */}
          <div className="bg-slate-50 p-8 rounded-3xl border shadow-xl flex flex-col">
            <textarea
              disabled={!audioPlayed}
              value={typedAnswer}
              onChange={(e) => setTypedAnswer(e.target.value)}
              className="w-full h-64 p-6 border rounded-xl text-lg outline-none"
              placeholder="Start typing what you heard..."
            />

            <button
              onClick={submitDictation}
              disabled={typedAnswer.trim().length < 3}
              className="mt-6 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl"
            >
              Submit Dictation
            </button>
          </div>
        </div>

      ) : (
        /* ================= VERBAL UI ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">

          {/* LEFT — QUESTION */}
          <div className="bg-white p-10 rounded-3xl shadow-xl border">
            <p className="text-2xl font-semibold">{currentQuestion.text}</p>
          </div>

          {/* RIGHT — RECORDING VISUAL */}
          <div className="bg-slate-900 p-10 rounded-3xl shadow-xl text-center text-white relative">

            {phase === "RECORDING" ? (
              <>
                <div className="mb-6">
                  <Mic className="w-12 h-12 text-red-400 animate-pulse mx-auto" />
                </div>
                <p className="text-2xl font-bold mb-2">Recording...</p>
                <p className="text-slate-400">Time Left: {timeLeft}s</p>
              </>
            ) : phase === "PROCESSING" ? (
              <>
                <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" />
                <p className="text-xl">Analyzing Response...</p>
              </>
            ) : (
              <>
                <Eye className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <p className="text-xl font-bold">Reading Time</p>
                <p className="text-slate-400">Time Left: {timeLeft}s</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentSession;
