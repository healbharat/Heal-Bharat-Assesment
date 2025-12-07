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

  // -------------------  SECURITY HANDLING  -------------------
  useEffect(() => {
    initMedia();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleSecurityViolation();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleSecurityViolation = () => {
    setWarnings(prev => {
      const newCount = prev + 1;
      if (newCount === 1) {
        alert("WARNING (1/2): Screen minimization detected.");
      } else if (newCount >= 2) {
        onBlock();
      }
      return newCount;
    });
  };

  // -------------------  INITIALIZE MEDIA -------------------
  const initMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      mediaStreamRef.current = stream;
      setMediaStream(stream);
    } catch (err) {
      alert("Camera & Microphone access required.");
    }
  };

  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

  // -------------------  QUESTION FLOW -------------------
  useEffect(() => {
    startPrepPhase();
    return () => timerRef.current && clearInterval(timerRef.current);
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

  // -------------------  MIME DETECTION -------------------
// determine supported mime type
const getSupportedMime = () => {
  if (typeof MediaRecorder === "undefined") return null;
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  if (MediaRecorder.isTypeSupported("audio/mpeg")) return "audio/mpeg";
  return null;
};

const startRecordingPhase = () => {
  setPhase('RECORDING');
  setTimeLeft(RECORD_DURATION);

  if (!mediaStreamRef.current) {
    alert("Microphone not active. Ensure permissions are granted.");
    return;
  }

  const supported = getSupportedMime();
  let options = supported ? { mimeType: supported } : undefined;

  let mediaRecorder;
  try {
    mediaRecorder = new MediaRecorder(mediaStreamRef.current, options);
  } catch (err) {
    console.error("MediaRecorder start error", err);
    // try fallback without options
    try {
      mediaRecorder = new MediaRecorder(mediaStreamRef.current);
    } catch (err2) {
      alert("Unable to start recorder on this browser/device. Try Chrome or update browser.");
      console.error("MediaRecorder final failure", err2);
      return;
    }
  }

  mediaRecorderRef.current = mediaRecorder;
  chunksRef.current = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
  };
  mediaRecorder.start();
  // ... rest unchanged
};

  // -------------------  START RECORDING -------------------
  const startRecordingPhase = () => {
    setPhase("RECORDING");
    setTimeLeft(RECORD_DURATION);

    if (!mediaStreamRef.current) {
      alert("Microphone not active!");
      return;
    }

    const mimeType = getSupportedMime();
    console.log("🎤 Using MIME:", mimeType || "DEFAULT");

    let recorder: MediaRecorder;

    try {
      recorder = mimeType
        ? new MediaRecorder(mediaStreamRef.current, { mimeType })
        : new MediaRecorder(mediaStreamRef.current);
    } catch (err: any) {
      console.error("MediaRecorder create error:", err);
      alert("Browser does not support audio recording: " + err.message);
      return;
    }

    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = e => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onerror = e => {
      console.error("Recorder Error:", e);
    };

    try {
      recorder.start();
    } catch (err: any) {
      console.error("MediaRecorder start error:", err);
      alert("Recording could not start: " + err.message);
      return;
    }

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

  // -------------------  STOP RECORDING -------------------
  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      setPhase("PROCESSING");

      recorder.onstop = async () => {
        const mime = getSupportedMime() || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mime });

        console.log("🎧 Recorded Blob:", blob.type, blob.size);

        await processAnswer(blob);
      };
    }
  };

  // -------------------  PROCESS ANSWER -------------------
  const processAnswer = async (audioBlob: Blob) => {
    try {
      if (!audioBlob || audioBlob.size < 200) {
        console.error("❌ EMPTY AUDIO BLOB");
        alert("Audio too low or empty. Speak louder next time.");
      }

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
    } catch (err: any) {
      console.error("❌ Evaluation Error:", err);
      alert("Error processing answer: " + err.message);

      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        onComplete(results);
      }
    }
  };

  // -------------------  UI (UNCHANGED) -------------------
  return (
    <div className="max-w-6xl mx-auto w-full px-6 h-full flex flex-col justify-center relative font-sans">

      {/* Camera Bubble */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="w-32 h-32 rounded-full border-4 border-indigo-600 shadow-2xl overflow-hidden bg-black">
          {mediaStream ? (
            <video ref={videoRef} autoPlay muted className="w-full h-full object-cover scale-x-[-1]" />
          ) : (
            <div className="flex items-center justify-center h-full text-white">
              <Camera className="w-8 h-8 opacity-50" />
            </div>
          )}
        </div>
      </div>

      {/* HEADER */}
      <div className="mb-8">
        <div className="flex justify-between items-end mb-4">
          <div>
            <span className="text-indigo-600 text-xs font-bold">Verbal Assessment</span>
            <h2 className="text-3xl font-extrabold mt-2">Question {currentIndex + 1} / {questions.length}</h2>
          </div>

          <div>
            <div className="flex items-center space-x-2 text-sm font-medium">
              <ShieldAlert className={`w-4 h-4 ${warnings > 0 ? 'text-red-500' : 'text-gray-500'}`} />
              <span>Warnings: {warnings}/2</span>
            </div>
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        
        {/* LEFT — QUESTION */}
        <div className="space-y-6 flex flex-col">
          <div className="bg-white p-10 rounded-3xl shadow border">
            <p className="text-3xl font-medium text-gray-800">{currentQuestion.text}</p>
          </div>

          <div className="p-6 rounded-2xl border">
            <div className="flex items-center">
              <div className="p-3 rounded-xl mr-4 bg-indigo-100">
                {phase === "PREP" && <Eye className="w-6 h-6 text-indigo-600" />}
                {phase === "RECORDING" && <Mic className="w-6 h-6 text-red-600" />}
                {phase === "PROCESSING" && <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />}
              </div>

              <div>
                <span className="text-xs opacity-70">Current Phase</span>
                <span className="block text-xl font-bold">
                  {phase === "PREP" ? "READING" : 
                   phase === "RECORDING" ? "SPEAK NOW" : "ANALYZING..."}
                </span>
              </div>
            </div>

            {phase !== "PROCESSING" && (
              <div className="mt-4 text-right text-4xl font-mono">
                00:{timeLeft.toString().padStart(2, "0")}
              </div>
            )}
          </div>

          {phase === "PREP" && (
            <div className="p-4 bg-gray-100 rounded-xl flex text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-500 mr-3" />
              <p>Prepare your answer. Recording will start automatically.</p>
            </div>
          )}
        </div>

        {/* RIGHT — VISUALIZER */}
        <div className={`flex flex-col items-center justify-center p-8 rounded-3xl h-[400px] relative border ${phase === "RECORDING" ? "bg-black text-white" : "bg-gray-100"}`}>
          {phase === "RECORDING" && (
            <Visualizer stream={mediaStream} isRecording={true} />
          )}
        </div>
      </div>
    </div>
  );
};

export default AssessmentSession;
