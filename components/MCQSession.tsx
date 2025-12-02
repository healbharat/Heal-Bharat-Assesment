
import React, { useState, useEffect, useRef } from 'react';
import { McqQuestion } from '../types';
import { Timer, ArrowRight, Lock, Camera, CheckCircle2, Circle, X } from 'lucide-react';

interface MCQSessionProps {
  title: string;
  questions: McqQuestion[];
  durationMinutes: number;
  candidateName: string;
  onComplete: (score: number) => void;
  onBlock: () => void;
}

const MCQSession: React.FC<MCQSessionProps> = ({ 
  title, 
  questions, 
  durationMinutes, 
  candidateName,
  onComplete,
  onBlock 
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  
  // Camera Stream
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // 1. Get Camera
    const initCamera = async () => {
        try {
            const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            setStream(s);
            if (videoRef.current) {
                videoRef.current.srcObject = s;
            }
        } catch (e) {
            console.error("Camera failed in MCQ", e);
        }
    };
    initCamera();

    // 2. Visibility / Anti-Cheat Listener
    const handleVisibilityChange = () => {
        if (document.hidden) {
            handleSecurityViolation();
        }
    };

    // Disable Right Click & Copy
    const preventDefault = (e: Event) => e.preventDefault();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("contextmenu", preventDefault);
    document.addEventListener("copy", preventDefault);
    document.addEventListener("cut", preventDefault);
    document.addEventListener("paste", preventDefault);

    // Start Timer
    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleSubmitTest(); // Auto submit
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("contextmenu", preventDefault);
      document.removeEventListener("copy", preventDefault);
      document.removeEventListener("cut", preventDefault);
      document.removeEventListener("paste", preventDefault);
      if (timerRef.current) clearInterval(timerRef.current);
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const violationsRef = useRef(0);

  const handleSecurityViolation = () => {
    violationsRef.current += 1;
    const count = violationsRef.current;

    if (count === 1) {
        alert("⚠️ WARNING (1/2): Screen minimization detected.\n\nThis is your ONLY warning. Do not switch tabs or minimize the browser.\n\nHeal Bharat Services Proctoring is Active.");
    } else if (count >= 2) {
        onBlock(); // Immediate Block
    }
  };

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
  };

  const handleClearResponse = () => {
      setSelectedOption(null);
  };

  const handleNext = () => {
    // Save answer only if moving forward
    if (selectedOption) {
      setAnswers(prev => ({
        ...prev,
        [questions[currentIdx].id]: selectedOption
      }));
    }

    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setSelectedOption(null); // Reset selection for next Q
    } else {
      handleSubmitTest();
    }
  };

  const handleSubmitTest = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    // Capture last answer if any
    let finalAnswers = { ...answers };
    if (selectedOption) {
      finalAnswers[questions[currentIdx].id] = selectedOption;
    }

    let correctCount = 0;
    questions.forEach(q => {
      if (finalAnswers[q.id] === q.correctAnswer) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);
    onComplete(score);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const currentQ = questions[currentIdx];

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden font-sans select-none">
      
      {/* 1. Header Bar (CBT Style) */}
      <header className="bg-slate-900 text-white h-16 flex items-center justify-between px-6 shadow-md z-30 flex-shrink-0">
         <div className="flex items-center space-x-4">
             <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-bold text-sm">TX</div>
             <div>
                 <h1 className="font-bold text-sm md:text-base leading-tight">{title}</h1>
                 <div className="text-[10px] text-slate-400">Heal Bharat Services Assessment</div>
             </div>
         </div>

         <div className="flex items-center space-x-6">
             <div className={`flex items-center space-x-2 px-3 py-1 rounded bg-slate-800 border border-slate-700 ${timeLeft < 300 ? 'text-red-400 border-red-900 animate-pulse' : 'text-white'}`}>
                 <Timer className="w-4 h-4" />
                 <span className="font-mono text-lg font-bold">{formatTime(timeLeft)}</span>
             </div>
             
             <div className="flex items-center space-x-3 pl-6 border-l border-slate-700">
                 <div className="text-right hidden md:block">
                     <div className="text-sm font-bold">{candidateName}</div>
                     <div className="text-xs text-slate-400">Candidate</div>
                 </div>
                 <div className="w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center text-sm font-bold border-2 border-slate-700">
                     {candidateName.charAt(0)}
                 </div>
             </div>
         </div>
      </header>

      {/* 2. Main Body */}
      <div className="flex flex-1 overflow-hidden">
          
          {/* LEFT: Question Area */}
          <main className="flex-1 flex flex-col bg-white overflow-hidden relative">
             
             {/* Watermark */}
             <div className="absolute inset-0 pointer-events-none opacity-[0.03] flex flex-wrap content-start justify-start overflow-hidden rotate-[-12deg] scale-125 z-0">
                 {Array.from({ length: 50 }).map((_, i) => (
                     <div key={i} className="m-12 text-4xl font-black text-slate-900 whitespace-nowrap">
                         Heal Bharat Services
                     </div>
                 ))}
             </div>

             <div className="flex-1 overflow-y-auto p-6 md:p-10 z-10">
                 <div className="max-w-4xl mx-auto">
                     <div className="mb-6 border-b border-slate-100 pb-4 flex justify-between items-start">
                         <div>
                            <span className="inline-block bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-1 rounded mb-2">Question {currentIdx + 1}</span>
                            <div className="text-lg md:text-xl font-medium text-slate-900 leading-relaxed">
                                {currentQ.text}
                            </div>
                         </div>
                     </div>

                     <div className="space-y-3">
                         {currentQ.options.map((option, idx) => {
                             const isSelected = selectedOption === option;
                             return (
                                 <label 
                                    key={idx}
                                    className={`flex items-start p-4 rounded-lg border cursor-pointer transition-all duration-200 group ${
                                        isSelected 
                                        ? 'bg-indigo-50 border-indigo-600 shadow-sm' 
                                        : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                    }`}
                                 >
                                     <div className="flex items-center h-5 mt-0.5">
                                         <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                                             isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-400 bg-white group-hover:border-indigo-400'
                                         }`}>
                                             {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                         </div>
                                     </div>
                                     <span className={`ml-4 text-sm md:text-base ${isSelected ? 'text-indigo-900 font-medium' : 'text-slate-700'}`}>
                                         {option}
                                     </span>
                                     <input 
                                        type="radio" 
                                        name="option" 
                                        className="hidden" 
                                        checked={isSelected} 
                                        onChange={() => handleOptionSelect(option)}
                                     />
                                 </label>
                             );
                         })}
                     </div>
                 </div>
             </div>

             {/* Footer Navigation */}
             <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between items-center z-20 flex-shrink-0">
                 <button 
                    onClick={handleClearResponse}
                    disabled={!selectedOption}
                    className="text-slate-500 hover:text-red-600 text-sm font-medium px-4 py-2 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                 >
                    Clear Response
                 </button>
                 
                 <button 
                    onClick={handleNext}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded shadow-sm text-sm font-bold flex items-center transition-colors"
                 >
                    {currentIdx === questions.length - 1 ? 'Submit Test' : 'Save & Next'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                 </button>
             </div>
          </main>

          {/* RIGHT: Sidebar / Palette */}
          <aside className="w-72 bg-slate-50 border-l border-slate-200 flex flex-col z-20 shadow-xl">
              
              {/* Camera Feed */}
              <div className="p-4 border-b border-slate-200 bg-white">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Proctoring Feed</div>
                  <div className="aspect-video bg-black rounded-lg overflow-hidden relative shadow-inner">
                      {stream ? (
                          <video ref={videoRef} autoPlay muted className="w-full h-full object-cover transform scale-x-[-1]" />
                      ) : (
                          <div className="flex items-center justify-center h-full text-slate-500">
                              <Camera className="w-6 h-6 opacity-50" />
                          </div>
                      )}
                      <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_#22c55e]"></div>
                  </div>
              </div>

              {/* Palette */}
              <div className="flex-1 overflow-y-auto p-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Question Palette</div>
                  
                  <div className="grid grid-cols-5 gap-2">
                      {questions.map((q, idx) => {
                          const isCurrent = idx === currentIdx;
                          const isAnswered = answers[q.id];
                          
                          let bgClass = "bg-white border-slate-300 text-slate-600"; // Not visited / Default
                          if (isCurrent) bgClass = "bg-blue-600 border-blue-600 text-white";
                          else if (isAnswered) bgClass = "bg-green-500 border-green-500 text-white";
                          else if (idx < currentIdx) bgClass = "bg-red-100 border-red-200 text-red-400"; // Skipped/Past (Since strictly one-way, past unanswered is essentially skipped)

                          return (
                              <div 
                                key={q.id}
                                className={`aspect-square rounded flex items-center justify-center text-xs font-bold border transition-all ${bgClass}`}
                              >
                                  {idx + 1}
                              </div>
                          );
                      })}
                  </div>

                  {/* Legend */}
                  <div className="mt-6 space-y-2">
                      <div className="flex items-center">
                          <div className="w-4 h-4 rounded bg-green-500 mr-2"></div>
                          <span className="text-xs text-slate-600">Answered</span>
                      </div>
                      <div className="flex items-center">
                          <div className="w-4 h-4 rounded bg-red-100 border border-red-200 mr-2"></div>
                          <span className="text-xs text-slate-600">Not Answered</span>
                      </div>
                      <div className="flex items-center">
                          <div className="w-4 h-4 rounded bg-blue-600 mr-2"></div>
                          <span className="text-xs text-slate-600">Current</span>
                      </div>
                      <div className="flex items-center">
                          <div className="w-4 h-4 rounded bg-white border border-slate-300 mr-2"></div>
                          <span className="text-xs text-slate-600">Not Visited</span>
                      </div>
                  </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-white text-center">
                  <div className="text-[10px] text-slate-400">
                      ID: {questions[currentIdx].id.toUpperCase()}-{Date.now().toString().slice(-4)}
                  </div>
              </div>
          </aside>
      </div>
    </div>
  );
};

export default MCQSession;
