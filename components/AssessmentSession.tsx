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

  // ------------------- SECURITY -------------------
  useEffect(() => {
    initMedia();

    const handleVisibilityChange = () => {
      if (document.hidden) handleSecurityViolation();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleSecurityViolation = () => {
    setWarnings(prev => {
      const newCount = prev + 1;
      if (newCount === 1) alert("WARNING 1/2: Screen minimized.");
      else if (newCount >= 2) onBlock();
      return newCount;
    });
  };

  // ------------------- MEDIA INIT -------------------
  const initMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      mediaStreamRef.current = stream;
      setMediaStream(stream);
    } catch {
      alert("Camera/Microphone required.");
    }
  };

  useEffect(() => {
    if (videoRef.current && mediaStream) videoRef.current.srcObject = mediaStream;
  }, [mediaStream]);

  // ------------------- QUESTION FLOW -------------------
  useEffect(() => {
    startPrepPhase();
    return () => timerRef.current && clearInterval(timerRef.current);
  }, [currentIndex]);

  const startPrepPhase = () => {
    setPhase("PREP");
    setTimeLeft(READ_DURATION);
    clearInterval(timerRef.current!);

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

  // ------------------- MIME DETECTOR -------------------
  const getSupportedMime = () => {
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
    if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
    if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
    return "audio/webm";
  };

  // ------------------- FIXED RECORDING FUNCTION -------------------
  const startRecordingPhase = () => {
    setPhase("RECORDING");
    setTimeLeft(RECORD_DURATION);

    if (!mediaStreamRef.current) {
      alert("Microphone not active!");
      return;
    }

    const mimeType = getSupportedMime();
    let recorder: MediaRecorder;

    try {
      recorder = new MediaRecorder(mediaStreamRef.current, { mimeType });
    } catch {
      recorder = new MediaRecorder(mediaStreamRef.current);
    }

    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = e => e.data.size > 0 && chunksRef.current.push(e.data);

    recorder.start();

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

  // ------------------- STOP -------------------
  const stopRecording = () => {
    clearInterval(timerRef.current!);

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    recorder.stop();
    setPhase("PROCESSING");

    recorder.onstop = async () => {
      const mimeType = getSupportedMime();
      const blob = new Blob(chunksRef.current, { type: mimeType });
      await processAnswer(blob);
    };
  };

  // ------------------- PROCESS ANSWER -------------------
  const processAnswer = async (audioBlob: Blob) => {
    try {
      const base64Audio = await blobToBase64(audioBlob);
      const evaluation = await evaluateAnswer(currentQuestion, base64Audio, audioBlob.type);

      const updated = [...results, evaluation];
      setResults(updated);

      if (currentIndex < questions.length - 1) setCurrentIndex(i => i + 1);
      else onComplete(updated);

    } catch (err) {
      alert("Error evaluating answer.");
      if (currentIndex < questions.length - 1) setCurrentIndex(i => i + 1);
      else onComplete(results);
    }
  };

  // ------------------- UI -------------------
  return (
    <div className="max-w-6xl mx-auto w-full px-6 h-full flex flex-col justify-center">
      <div className="fixed bottom-6 right-6 w-32 h-32 rounded-full overflow-hidden bg-black border-4 border-indigo-600">
        {mediaStream ? <video ref={videoRef} autoPlay muted className="w-full h-full object-cover scale-x-[-1]" /> :
          <Camera className="w-8 h-8 text-white mx-auto mt-10" />}
      </div>

      <h2 className="text-3xl font-bold mb-4">Question {currentIndex + 1}/{questions.length}</h2>

      <p className="text-xl bg-white p-6 rounded-xl shadow">{currentQuestion.text}</p>

      <div className="mt-6 text-center text-4xl">
        {phase !== "PROCESSING" && <>00:{timeLeft.toString().padStart(2, "0")}</>}
      </div>

      <div className="mt-8 h-[250px] bg-gray-100 rounded-xl flex items-center justify-center">
        {phase === "RECORDING" && <Visualizer stream={mediaStream} isRecording={true} />}
      </div>
    </div>
  );
};

export default AssessmentSession;
