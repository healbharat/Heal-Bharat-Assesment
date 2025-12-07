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

const AssessmentSession: React.FC<AssessmentSessionProps> = ({
  questions,
  onComplete,
  onBlock,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("PREP");

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

  /** ---------------------------
   * ANTI-CHEAT SECURITY
   -------------------------------- */
  useEffect(() => {
    initMedia();

    const handleVisibility = () => {
      if (document.hidden) handleSecurityViolation();
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);

      if (mediaStreamRef.current)
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());

      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleSecurityViolation = () => {
    setWarnings((count) => {
      const newCount = count + 1;

      if (newCount === 1) {
        alert("⚠️ WARNING 1/2:\nSwitching tabs or minimizing is not allowed.");
      } else if (newCount >= 2) {
        onBlock();
      }

      return newCount;
    });
  };

  /** ---------------------------
   * INITIALIZE CAMERA + MIC
   -------------------------------- */
  const initMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      mediaStreamRef.current = stream;
      setMediaStream(stream);
    } catch (err) {
      alert("Camera + Microphone access is required to continue.");
    }
  };

  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

  /** ---------------------------
   * QUESTION CYCLE
   -------------------------------- */
  useEffect(() => {
    startPrepPhase();
    return () => timerRef.current && clearInterval(timerRef.current);
  }, [currentIndex]);

  const startPrepPhase = () => {
    setPhase("PREP");
    setTimeLeft(READ_DURATION);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          startRecordingPhase();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  /** ---------------------------
   * MIME FALLBACK LOGIC
   -------------------------------- */
  const getSupportedMime = () => {
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus"))
      return "audio/webm;codecs=opus";
    if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
    if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
    return "audio/webm"; // universal fallback
  };

  /** ---------------------------
   * START RECORDING
   -------------------------------- */
  const startRecordingPhase = () => {
    setPhase("RECORDING");
    setTimeLeft(RECORD_DURATION);

    if (!mediaStreamRef.current) {
      alert("Microphone not detected. Allow permissions.");
      return;
    }

    const mimeType = getSupportedMime();

    let recorder: MediaRecorder;

    try {
      recorder = new MediaRecorder(mediaStreamRef.current, { mimeType });
    } catch (err) {
      alert("Your browser does not support audio recording.");
      return;
    }

    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.start();

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  /** ---------------------------
   * STOP RECORDING
   -------------------------------- */
  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    recorder.stop();
    setPhase("PROCESSING");

    recorder.onstop = async () => {
      const mime = getSupportedMime();
      const blob = new Blob(chunksRef.current, { type: mime });

      if (blob.size < 500) {
        alert("Your audio was too silent or empty. Try speaking louder.");
      }

      await processAnswer(blob, mime);
    };
  };

  /** ---------------------------
   * PROCESS RECORDED AUDIO
   -------------------------------- */
  const processAnswer = async (audioBlob: Blob, mimeType: string) => {
    try {
      const base64Audio = await blobToBase64(audioBlob);

      const evaluation = await evaluateAnswer(
        currentQuestion,
        base64Audio,
        mimeType
      );

      const updated = [...results, evaluation];
      setResults(updated);

      if (currentIndex < questions.length - 1) {
        setCurrentIndex((i) => i + 1);
      } else {
        onComplete(updated);
      }
    } catch (err) {
      console.error("Evaluation failed:", err);
      alert("Error processing answer. Moving to next question.");

      if (currentIndex < questions.length - 1) {
        setCurrentIndex((i) => i + 1);
      } else {
        onComplete(results);
      }
    }
  };

  /** ---------------------------
   * UI (UNCHANGED)
   -------------------------------- */
  return (
    <div className="max-w-6xl mx-auto w-full px-6 h-full flex flex-col justify-center relative font-sans">

      {/* CAMERA BUBBLE */}
      <div className="fixed bottom-6 right-6">
        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-indigo-600">
          <video ref={videoRef} autoPlay muted className="w-full h-full object-cover scale-x-[-1]" />
        </div>
      </div>

      {/* HEADER */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold">
          Question {currentIndex + 1} / {questions.length}
        </h2>
        <div>Warnings: {warnings}/2</div>
      </div>

      {/* MAIN CONTENT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

        <div className="p-6 bg-white rounded-xl shadow">
          <p className="text-2xl">{currentQuestion.text}</p>
        </div>

        <div className="p-6 bg-gray-200 rounded-xl">
          {phase === "RECORDING" && (
            <Visualizer stream={mediaStream} isRecording={true} />
          )}
        </div>
      </div>
    </div>
  );
};

export default AssessmentSession;
