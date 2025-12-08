import React, { useState, useEffect, useRef } from "react";
import { Question, EvaluationResult } from "../types";
import { ShieldAlert, Camera } from "lucide-react";

interface AssessmentSessionProps {
  questions: Question[];
  onComplete: (results: EvaluationResult[]) => void;
  onBlock: () => void;
}

const AssessmentSession: React.FC<AssessmentSessionProps> = ({
  questions,
  onComplete,
  onBlock,
}) => {
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [index, setIndex] = useState(0);
  const [warnings, setWarnings] = useState(0);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  const current = questions[index];

  /* ======================================================
        SECURITY CHECK (TAB SWITCH)
  ====================================================== */
  const handleSecurityViolation = () => {
    setWarnings((w) => {
      const next = w + 1;

      if (next === 1) {
        alert("⚠ Warning 1/2: Do not switch windows.");
      } else if (next >= 2) {
        alert("❌ You are blocked for cheating.");
        onBlock();
      }

      return next;
    });
  };

  useEffect(() => {
    // Tab change security
    const detect = () => {
      if (document.hidden) handleSecurityViolation();
    };

    document.addEventListener("visibilitychange", detect);

    return () => document.removeEventListener("visibilitychange", detect);
  }, []);

  /* ======================================================
        CAMERA INIT
  ====================================================== */
  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      setMediaStream(stream);
    } catch (err) {
      alert("Camera is required for the assessment.");
    }
  };

  useEffect(() => {
    initCamera();
  }, []);

  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

  /* ======================================================
        HANDLE MCQ ANSWERS
  ====================================================== */
  const handleSelect = (qId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: option }));
  };

  const nextQuestion = () => {
    if (index < questions.length - 1) {
      setIndex((i) => i + 1);
    } else {
      finishTest();
    }
  };

  /* ======================================================
        FINAL SCORE CALCULATION (MCQ ONLY)
  ====================================================== */
  const finishTest = () => {
    const results: EvaluationResult[] = questions.map((q) => {
      const correct = q.correctAnswer === answers[q.id];
      const score = correct ? 100 : 0;

      return {
        questionId: q.id,
        transcription: answers[q.id] || "",
        overallScore: score,
        clarity: { score, reasoning: "MCQ automatic grading" },
        confidence: { score, reasoning: "MCQ automatic grading" },
        contentQuality: { score, reasoning: correct ? "Correct answer" : "Wrong answer" },
        grammarAndFluency: { score, reasoning: "MCQ" },
        keyTakeaways: [],
        improvementTips: [],
      };
    });

    onComplete(results);
  };

  /* ======================================================
        UI
  ====================================================== */
  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 font-sans relative">
      
      {/* CAMERA BUBBLE */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="w-32 h-32 rounded-full border-4 border-indigo-600 shadow-xl overflow-hidden bg-black">
          {mediaStream ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
          ) : (
            <div className="flex justify-center items-center h-full text-white">
              <Camera className="w-8 h-8 opacity-60" />
            </div>
          )}
        </div>
        <p className="text-center mt-2 text-xs text-indigo-800 font-bold bg-white px-2 py-1 rounded-full border">
          Live Monitoring
        </p>
      </div>

      {/* SECURITY WARNINGS */}
      <div className="flex justify-end mb-4">
        <div className="flex items-center bg-red-50 border border-red-300 px-3 py-1.5 rounded-lg">
          <ShieldAlert className="w-4 h-4 text-red-600" />
          <span className="ml-2 font-medium text-red-600">
            Warnings: {warnings}/2
          </span>
        </div>
      </div>

      {/* MCQ AREA */}
      <h2 className="text-2xl font-bold mb-6">
        Question {index + 1} / {questions.length}
      </h2>

      <div className="bg-white p-6 rounded-xl shadow border">
        <p className="text-lg font-semibold mb-4">{current.text}</p>

        {current.options?.map((opt) => (
          <label
            key={opt}
            className="block border p-3 rounded-lg mb-2 cursor-pointer hover:bg-indigo-50"
          >
            <input
              type="radio"
              name={current.id}
              className="mr-3"
              checked={answers[current.id] === opt}
              onChange={() => handleSelect(current.id, opt)}
            />
            {opt}
          </label>
        ))}
      </div>

      <button
        onClick={nextQuestion}
        disabled={!answers[current.id]}
        className="mt-6 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
      >
        {index === questions.length - 1 ? "Finish" : "Next"}
      </button>
    </div>
  );
};

export default AssessmentSession;
