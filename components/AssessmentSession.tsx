import React, { useState, useEffect, useRef } from "react";
import { Question, EvaluationResult } from "../types";
import { evaluateAnswer } from "../services/gemini";
import { blobToBase64 } from "../services/audioUtils";
import Visualizer from "./Visualizer";
import { Mic, Loader2, Camera, Eye, AlertTriangle, ShieldAlert } from "lucide-react";

interface AssessmentSessionProps {
  questions: Question[];
  onComplete: (results: EvaluationResult[]) => void;
  onBlock: () => void;
}

const READ_DURATION = 10;
const RECORD_DURATION = 10;

type Phase = "PREP" | "RECORDING" | "PROCESSING";

export default function AssessmentSession({ questions, onComplete, onBlock }: AssessmentSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("PREP");
  const [timeLeft, setTimeLeft] = useState(READ_DURATION);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const [warnings, setWarnings] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    initMedia();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      clearInterval(timerRef.current!);
    };
  }, []);

  const onVisibility = () => {
    if (document.hidden) {
      setWarnings((w) => {
        if (w + 1 >= 2) onBlock();
        else alert("WARNING: Don't minimize the screen (1/2).");
        return w + 1;
      });
    }
  };

  const initMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      mediaStreamRef.current = stream;
      setMediaStream(stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      alert("Camera & microphone required.");
    }
  };

  useEffect(() => {
    startPrepPhase();
  }, [currentIndex]);

  const startPrepPhase = () => {
    setPhase("PREP");
    setTimeLeft(READ_DURATION);
    clearInterval(timerRef.current!);

    timerRef.current = window.setInterval(() => {
      setTimeLeft((sec) => {
        if (sec <= 1) {
          clearInterval(timerRef.current!);
          startRecordingPhase();
          return 0;
        }
        return sec - 1;
      });
    }, 1000);
  };

  const getSupportedMime = () => {
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
    if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
    if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
    return "audio/webm";
  };

  const startRecordingPhase = () => {
    setPhase("RECORDING");
    setTimeLeft(RECORD_DURATION);
    clearInterval(timerRef.current!);

    if (!mediaStreamRef.current) {
      alert("Microphone not ready.");
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

    recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);

    recorder.start();

    timerRef.current = window.setInterval(() => {
      setTimeLeft((sec) => {
        if (sec <= 1) {
          stopRecording();
          return 0;
        }
        return sec - 1;
      });
    }, 1000);
  };

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

  const processAnswer = async (audioBlob: Blob) => {
    try {
      const base64 = await blobToBase64(audioBlob);
      const evalResult = await evaluateAnswer(currentQuestion, base64, audioBlob.type);

      const updated = [...results, evalResult];
      setResults(updated);

      if (currentIndex < questions.length - 1) setCurrentIndex((i) => i + 1);
      else onComplete(updated);
    } catch (err: any) {
      alert("Error evaluating answer.");
      if (currentIndex < questions.length - 1) setCurrentIndex((i) => i + 1);
      else onComplete(results);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">

      <div className="fixed bottom-6 right-6 w-32 h-32 rounded-full overflow-hidden bg-black border-4 border-indigo-600">
        <video ref={videoRef} autoPlay muted className="w-full h-full object-cover scale-x-[-1]" />
      </div>

      <h2 className="text-3xl font-bold">Question {currentIndex + 1}/{questions.length}</h2>

      <div className="bg-white p-6 rounded-xl shadow mt-4">
        <p className="text-xl">{currentQuestion.text}</p>
      </div>

      <div className="mt-6 text-center text-4xl">{phase !== "PROCESSING" && `00:${timeLeft.toString().padStart(2, "0")}`}</div>

      <div className="mt-6 bg-gray-100 rounded-xl h-[250px] flex items-center justify-center">
        {phase === "RECORDING" && <Visualizer stream={mediaStream} isRecording={true} />}
        {phase === "PROCESSING" && <Loader2 className="w-16 h-16 animate-spin text-indigo-600" />}
      </div>
    </div>
  );
}
