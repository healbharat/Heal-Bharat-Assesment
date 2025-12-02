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

const READ_DURATION = 30;
const RECORD_DURATION = 20;

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

  // ==========================
  // INITIALIZATION + SECURITY
  // ==========================

  useEffect(() => {
    initMedia();

    const handleVisibilityChange = () => {
      if (document.hidden) handleSecurityViolation();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (mediaStreamRef.current)
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleSecurityViolation = () => {
    setWarnings(prev => {
      const newCount = prev + 1;
      if (newCount === 1) {
        alert("WARNING (1/2): You switched tabs or minimized the screen.");
      } else if (newCount >= 2) {
        onBlock();
      }
      return newCount;
    });
  };

  const initMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setMediaStream(stream);
      mediaStreamRef.current = stream;
    } catch {
      alert("Camera and Microphone permissions required.");
    }
  };

  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

  // ==========================
  // FLOW CONTROL (PREP → RECORD → PROCESS)
  // ==========================

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

  const startRecordingPhase = () => {
    setPhase('RECORDING');
    setTimeLeft(RECORD_DURATION);

    if (!mediaStreamRef.current) {
      alert("Microphone not active.");
      return;
    }

    const recorder = new MediaRecorder(mediaStreamRef.current, {
      mimeType: MediaRecorder.isTypeSupported("audio/webm") 
        ? "audio/webm" 
        : "audio/ogg"
    });

    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
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

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setPhase("PROCESSING");

      mediaRecorderRef.current.onstop = async () => {
        const mime = mediaRecorderRef.current?.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mime });

        await processAnswer(blob);
      };
    }
  };

  const processAnswer = async (audioBlob: Blob) => {
    try {
      const base64Audio = await blobToBase64(audioBlob);
      const mimeType = audioBlob.type || "audio/webm";

      const evaluation = await evaluateAnswer(currentQuestion, base64Audio, mimeType);

      const updated = [...results, evaluation];
      setResults(updated);

      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        onComplete(updated);
      }
    } catch (error) {
      console.error("Evaluation failed", error);
      alert("Error processing answer. Moving to next question.");

      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        onComplete(results);
      }
    }
  };

  // ==========================
  // UI
  // ==========================

  return (
    <div className="max-w-6xl mx-auto w-full px-6 h-full flex flex-col justify-center relative font-sans">

      {/* CAMERA FEED */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="w-32 h-32 rounded-full border-4 border-indigo-600 overflow-hidden bg-black shadow-2xl">
          {mediaStream ? (
            <video ref={videoRef} autoPlay muted className="w-full h-full object-cover transform scale-x-[-1]" />
          ) : (
            <div className="flex items-center justify-center h-full text-white"> <Camera className="w-8 h-8 opacity-40" /> </div>
          )}
        </div>
      </div>

      {/* HEADER */}
      <div className="mb-8">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900">Question {currentIndex + 1} / {questions.length}</h2>
          </div>

          <div className="flex items-center space-x-2 text-sm font-medium bg-slate-100 px-3 py-1 rounded-lg">
            <ShieldAlert className={`w-4 h-4 ${warnings > 0 ? "text-red-600" : "text-slate-400"}`} />
            <span>Warnings: {warnings}/2</span>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">

        {/* QUESTION */}
        <div className="space-y-6">
          <div className="bg-white p-10 rounded-3xl shadow-xl border">
            <p className="text-3xl">{currentQuestion.text}</p>
          </div>

          <div className="p-6 rounded-xl border bg-slate-50">
            <h3 className="text-xl font-bold">
              {phase === "PREP" ? "Reading..." : phase === "RECORDING" ? "Recording..." : "Analyzing..."}
            </h3>
            <p>Time Left: {timeLeft}s</p>
          </div>
        </div>

        {/* VISUALIZER */}
        <div className="p-8 rounded-3xl bg-slate-100 border h-[400px] flex items-center justify-center">
          {phase === "RECORDING" ? (
            <>
              <Visualizer stream={mediaStream} isRecording={true} />
            </>
          ) : (
            <p className="text-slate-500">Microphone inactive</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssessmentSession;
