import React, { useState, useEffect, useRef } from 'react';
import { Question, EvaluationResult } from '../types';
import { evaluateAnswer } from '../services/gemini';
import { blobToBase64 } from '../services/audioUtils';
import Visualizer from './Visualizer';
import { Mic, Loader2, Camera, Eye, AlertTriangle, ShieldAlert } from 'lucide-react';

interface AssessmentSessionProps {
  questions: Question[];
  onComplete: (results: EvaluationResult[]) => void;
  onBlock: () => void;
}

const READ_DURATION = 10;
const RECORD_DURATION = 10;

type Phase = 'PREP' | 'RECORDING' | 'PROCESSING';

const AssessmentSession: React.FC<AssessmentSessionProps> = ({ questions, onComplete, onBlock }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('PREP');

  const [timeLeft, setTimeLeft] = useState(READ_DURATION);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [results, setResults] = useState<EvaluationResult[]>([]);

  const [warnings, setWarnings] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const currentQuestion = questions[currentIndex];

  // -------------------------------------------------------------
  // MEDIA INITIALIZATION
  // -------------------------------------------------------------
  useEffect(() => {
    initMedia();

    const handleVisibilityChange = () => {
      if (document.hidden) handleSecurityViolation();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleSecurityViolation = () => {
    setWarnings(prev => {
      const newW = prev + 1;
      if (newW === 1) {
        alert("WARNING (1/2): Do not minimize or switch tabs.");
      } else if (newW >= 2) {
        onBlock();
      }
      return newW;
    });
  };

  const initMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setMediaStream(stream);
      mediaStreamRef.current = stream;
    } catch (err) {
      console.error("Media Error:", err);
      alert("Camera/Microphone permission required!");
    }
  };

  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

  // -------------------------------------------------------------
  // QUESTION FLOW
  // -------------------------------------------------------------
  useEffect(() => {
    startPrepPhase();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex]);

  const startPrepPhase = () => {
    setPhase('PREP');
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

  // -------------------------------------------------------------
  // 🎤 FIXED — AUTO-DETECT MIME TYPE
  // -------------------------------------------------------------
  const detectMimeType = (): string => {
    if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
    if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
    if (MediaRecorder.isTypeSupported("audio/ogg")) return "audio/ogg";

    alert("Your browser does not support audio recording!");
    return "audio/webm";
  };

  const startRecordingPhase = () => {
    setPhase('RECORDING');
    setTimeLeft(RECORD_DURATION);

    if (!mediaStreamRef.current) {
      alert("Microphone not active!");
      return;
    }

    const mimeType = detectMimeType();
    console.log("🎤 Using MIME →", mimeType);

    const mediaRecorder = new MediaRecorder(mediaStreamRef.current, { mimeType });
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.start();

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

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setPhase("PROCESSING");

      mediaRecorderRef.current.onstop = async () => {
        const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        await processAnswer(blob);
      };
    }
  };

  // -------------------------------------------------------------
  // SEND AUDIO TO GEMINI
  // -------------------------------------------------------------
  const processAnswer = async (audioBlob: Blob) => {
    try {
      const base64Audio = await blobToBase64(audioBlob);
      const mimeType = audioBlob.type;

      const evaluation = await evaluateAnswer(currentQuestion, base64Audio, mimeType);

      const updated = [...results, evaluation];
      setResults(updated);

      if (currentIndex < questions.length - 1) {
        setCurrentIndex((p) => p + 1);
      } else {
        onComplete(updated);
      }
    } catch (err) {
      console.error("Evaluation failed:", err);
      alert("Error processing answer. Moving next…");

      if (currentIndex < questions.length - 1) {
        setCurrentIndex((p) => p + 1);
      } else {
        onComplete(results);
      }
    }
  };

  // -------------------------------------------------------------
  // UI JSX
  // -------------------------------------------------------------
  return (
    <div className="max-w-6xl mx-auto w-full px-6 h-full flex flex-col justify-center relative font-sans">
      
      {/* Floating Camera */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="w-32 h-32 rounded-full border-4 border-indigo-600 shadow-xl overflow-hidden bg-black">
          {mediaStream ? (
            <video ref={videoRef} autoPlay muted className="w-full h-full object-cover scale-x-[-1]" />
          ) : (
            <div className="flex items-center justify-center h-full text-white">
              <Camera className="w-8 h-8 opacity-50" />
            </div>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-end">
          <div>
            <span className="text-indigo-600 text-xs font-bold bg-indigo-50 px-2 py-1 rounded">Verbal Assessment</span>
            <h2 className="text-3xl font-bold mt-2">
              Question {currentIndex + 1} / {questions.length}
            </h2>
          </div>

          <div className="text-sm">
            <ShieldAlert className={`w-4 h-4 inline ${warnings ? "text-red-500" : "text-slate-400"}`} />
            <span className="ml-2">Warnings: {warnings}/2</span>
          </div>
        </div>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        
        {/* Question Box */}
        <div className="bg-white p-10 rounded-3xl shadow-xl border flex items-center">
          <p className="text-2xl font-medium">{currentQuestion.text}</p>
        </div>

        {/* Visualizer */}
        <div
          className={`flex flex-col items-center justify-center p-8 rounded-3xl h-[350px] ${
            phase === "RECORDING" ? "bg-slate-900 text-white" : "bg-slate-100"
          }`}
        >
          {phase === "RECORDING" && (
            <Visualizer stream={mediaStream} isRecording={true} />
          )}

          {phase === "PROCESSING" ? (
            <>
              <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
              <p className="mt-4 text-indigo-600">Analyzing Answer…</p>
            </>
          ) : phase === "RECORDING" ? (
            <>
              <Mic className="w-12 h-12 text-red-500 animate-pulse" />
              <p className="mt-4 opacity-70">Speak clearly</p>
            </>
          ) : (
            <>
              <Eye className="w-12 h-12 text-slate-500" />
              <p className="mt-4 text-slate-500">Reading Time</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssessmentSession;
