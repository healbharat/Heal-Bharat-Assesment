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

  // -----------------------------
  // INITIAL SETUP + PERMISSIONS
  // -----------------------------
  
  useEffect(() => {
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
        alert("Camera/Microphone access is required. Please enable permissions and refresh.");
      }
    };

    initMedia();

    // Anti-cheat
    const handleVisibilityChange = () => {
      if (document.hidden) handleSecurityViolation();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleSecurityViolation = () => {
    setWarnings(prev => {
      const count = prev + 1;
      if (count === 1) {
        alert("⚠ WARNING (1/2): Do not minimize or change tabs!");
      } else if (count >= 2) {
        onBlock();
      }
      return count;
    });
  };

  // -----------------------------
  // PHASE HANDLING
  // -----------------------------

  useEffect(() => {
    startPrepPhase();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex]);

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

  // -----------------------------
  // SAFE RECORDING START
  // -----------------------------
  
  const startRecordingPhase = () => {
    setPhase("RECORDING");
    setTimeLeft(RECORD_DURATION);

    const stream = mediaStreamRef.current;
    if (!stream) {
      alert("Microphone not available!");
      return;
    }

    // Determine supported mime type
    let mimeType = "";
    if (MediaRecorder.isTypeSupported("audio/webm")) mimeType = "audio/webm";
    else if (MediaRecorder.isTypeSupported("audio/mp4")) mimeType = "audio/mp4";
    else if (MediaRecorder.isTypeSupported("audio/ogg")) mimeType = "audio/ogg";
    else {
      alert("Your browser does not support audio recording. Use Chrome/Edge.");
      return;
    }

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType });
    } catch (err) {
      console.error("Recording Start Error:", err);
      alert("Could not start recording. Try refreshing & allow microphone.");
      return;
    }

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

  // -----------------------------
  // STOP + PROCESS ANSWER
  // -----------------------------

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    recorder.stop();

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current);
      await processAnswer(blob);
    };
  };

  const processAnswer = async (blob: Blob) => {
    try {
      setPhase("PROCESSING");

      const base64 = await blobToBase64(blob);
      const mimeType = blob.type || "audio/webm";

      const evaluation = await evaluateAnswer(currentQuestion, base64, mimeType);

      const updatedResults = [...results, evaluation];
      setResults(updatedResults);

      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        onComplete(updatedResults);
      }
    } catch (error) {
      console.error("Evaluation Error:", error);
      alert("Error processing answer. Moving to next.");

      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        onComplete(results);
      }
    }
  };

  // -----------------------------
  // UI COMPONENT
  // -----------------------------

  return (
    <div className="max-w-6xl mx-auto w-full px-6 h-full flex flex-col justify-center relative font-sans">

      {/* CAMERA FEED */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="w-32 h-32 rounded-full border-4 border-indigo-600 shadow-2xl overflow-hidden bg-black relative">
          <video 
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover scale-x-[-1]"
          />
        </div>
        <p className="text-xs text-indigo-900 font-bold mt-2 text-center">
          Live Feed
        </p>
      </div>

      {/* HEADER */}
      <div className="mb-8">
        <div className="flex justify-between items-end mb-4">
          <div>
            <span className="text-indigo-600 font-bold text-xs">Verbal Assessment</span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-2">
              Question {currentIndex + 1} / {questions.length}
            </h2>
          </div>

          <div className="text-sm bg-slate-100 px-3 py-1 rounded-lg">
            <ShieldAlert className="w-4 h-4 inline text-red-500" />
            Warnings: {warnings}/2
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-indigo-600 h-2 transition-all duration-500"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* MAIN AREA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">

        {/* QUESTION */}
        <div className="space-y-6">
          <div className="bg-white p-10 rounded-3xl shadow-lg border">
            <p className="text-2xl font-medium">{currentQuestion.text}</p>
          </div>

          <div className="flex items-center justify-between bg-slate-100 p-4 rounded-xl border">
            <div className="flex items-center space-x-4">
              {phase === 'PREP' && <Eye className="w-6 h-6 text-amber-600" />}
              {phase === 'RECORDING' && <Mic className="w-6 h-6 text-red-600" />}
              {phase === 'PROCESSING' && <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />}
              <div className="font-bold text-xl">
                {phase === 'PREP' && "READING"}
                {phase === 'RECORDING' && "RECORDING"}
                {phase === 'PROCESSING' && "ANALYZING"}
              </div>
            </div>

            {phase !== "PROCESSING" && (
              <div className="font-mono text-3xl">
                00:{timeLeft.toString().padStart(2, "0")}
              </div>
            )}
          </div>

        </div>

        {/* VISUALIZER */}
        <div className="p-8 rounded-3xl border bg-slate-50 h-[400px] relative">
          {phase === "RECORDING" ? (
            <Visualizer stream={mediaStream} isRecording={true} />
          ) : (
            <div className="text-center opacity-60 mt-32">Microphone Off</div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AssessmentSession;
