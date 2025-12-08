import React, { useState } from "react";
import { Question, EvaluationResult } from "../types";

interface AssessmentSessionProps {
  questions: Question[];
  onComplete: (results: EvaluationResult[]) => void;
}

const AssessmentSession: React.FC<AssessmentSessionProps> = ({
  questions,
  onComplete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});

  const currentQuestion = questions[currentIndex];

  // When user selects option
  const handleSelect = (option: string) => {
    setAnswers({ ...answers, [currentQuestion.id]: option });

    // Go to next question
    if (currentIndex < questions.length - 1) {
      setTimeout(() => setCurrentIndex((i) => i + 1), 300);
    } else {
      submitResults();
    }
  };

  // Convert MCQ to EvaluationResult format
const finalScore = calculateMCQScore();

const formattedResult: EvaluationResult = {
  questionId: "comm_mcq_1",
  transcription: "MCQ communication test",
  overallScore: finalScore,
  clarity: { score: finalScore, reasoning: "MCQ" },
  confidence: { score: finalScore, reasoning: "MCQ" },
  contentQuality: { score: finalScore, reasoning: "MCQ" },
  grammarAndFluency: { score: finalScore, reasoning: "MCQ" },
  keyTakeaways: [],
  improvementTips: []
};

onComplete([formattedResult]);


  return (
    <div className="max-w-3xl mx-auto mt-16">
      <h2 className="text-2xl font-bold mb-6">
        Question {currentIndex + 1} / {questions.length}
      </h2>

      <div className="bg-white p-6 rounded-xl shadow border">
        <p className="text-xl font-semibold mb-6">{currentQuestion.text}</p>

        <div className="space-y-3">
          {currentQuestion.options.map((opt) => (
            <button
              key={opt}
              onClick={() => handleSelect(opt)}
              className="w-full text-left px-4 py-3 border rounded-lg hover:bg-indigo-50"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AssessmentSession;
