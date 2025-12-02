
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
  
  // Security State
  const [warnings, setWarnings] = useState(0);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null); // To avoid stale closures

  const currentQuestion = questions[currentIndex];

  // --- INITIALIZATION & SECURITY ---

  useEffect(() => {
    initMedia();

    // Visibility / Anti-Cheat Listener
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSecurityViolation = () => {
      setWarnings(prev => {
          const newCount = prev + 1;
          if (newCount === 1) {
              alert("WARNING (1/2): Screen minimization detected.\n\nDo not switch tabs or minimize the browser. One more violation will permanently BLOCK you from this assessment.");
          } else if (newCount >= 2) {
              // Block User
              onBlock();
          }
          return newCount;
      });
  };

  const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        setMediaStream(stream);
        mediaStreamRef.current = stream; // Keep ref updated for intervals
      } catch (err) {
          console.error("Media Error:", err);
          alert("Camera and Microphone access is MANDATORY. Please enable permissions and refresh.");
      }
  };

  // Update Video Element
  useEffect(() => {
    if (videoRef.current && mediaStream) {
        videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

  // --- QUESTION FLOW ---

  // Handle Question Change
  useEffect(() => {
    startPrepPhase();
    // Cleanup interval on unmount or change
    return () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  const startPrepPhase = () => {
      setPhase('PREP');
      setTimeLeft(READ_DURATION);
      
      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
            if (prev <= 1) {
                clearInterval(timerRef.current!);
                startRecordingPhase(); // Function call within closure
                return 0;
            }
            return prev - 1;
        });
    }, 1000);
  };

  const startRecordingPhase = () => {
    setPhase('RECORDING');
    setTimeLeft(RECORD_DURATION);

    // Use REF here to ensure we have the stream even if called from a closure created earlier
    if (!mediaStreamRef.current) {
        console.error("No stream available for recording");
        // Try to recover or just wait (if stream is initializing)
        alert("Microphone not active. Ensure permissions are granted.");
        return; 
    }
    
    const mediaRecorder = new MediaRecorder(mediaStreamRef.current);
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.start();
    
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
            if (prev <= 1) {
                // Time up for Recording -> Stop
                stopRecording();
                return 0;
            }
            return prev - 1;
        });
    }, 1000);
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setPhase('PROCESSING');
      
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' }); 
        await processAnswer(blob);
      };
    }
  };

  const processAnswer = async (audioBlob: Blob) => {
    try {
      const base64Audio = await blobToBase64(audioBlob);
      const mimeType = audioBlob.type || 'audio/webm';
      
      const evaluation = await evaluateAnswer(currentQuestion, base64Audio, mimeType);
      
      const newResults = [...results, evaluation];
      setResults(newResults);

      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        onComplete(newResults);
      }
    } catch (error) {
      console.error("Evaluation failed", error);
      alert("Error processing answer. Moving to next.");
      // Even if failed, move next
      if (currentIndex < questions.length - 1) {
          setCurrentIndex(prev => prev + 1);
      } else {
          onComplete(results);
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full px-6 h-full flex flex-col justify-center relative font-sans">
        
        {/* Floating Camera Circle */}
        <div className="fixed bottom-6 right-6 z-50">
             <div className="w-32 h-32 rounded-full border-4 border-indigo-600 shadow-2xl overflow-hidden bg-black relative hover:scale-105 transition-transform duration-300">
                 {mediaStream ? (
                     <video 
                        ref={videoRef} 
                        autoPlay 
                        muted 
                        className="w-full h-full object-cover transform scale-x-[-1]" 
                     />
                 ) : (
                     <div className="flex items-center justify-center h-full text-white bg-slate-900">
                         <Camera className="w-8 h-8 opacity-50" />
                     </div>
                 )}
             </div>
             <p className="text-center text-xs text-indigo-900 font-bold mt-2 uppercase tracking-wider bg-white/80 backdrop-blur px-2 py-1 rounded-full border border-slate-200 inline-block absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
                Live Feed
             </p>
        </div>

        {/* Header */}
        <div className="mb-8">
             <div className="flex justify-between items-end mb-4">
                 <div>
                     <span className="text-indigo-600 font-bold text-xs uppercase tracking-wider bg-indigo-50 px-2 py-1 rounded-md">Verbal Assessment</span>
                     <h2 className="text-3xl font-extrabold text-slate-900 mt-2">Question {currentIndex + 1} / {questions.length}</h2>
                 </div>
                 <div className="flex flex-col items-end">
                     {phase === 'RECORDING' && (
                         <div className="flex items-center space-x-2 text-red-600 animate-pulse mb-2 bg-red-50 px-3 py-1 rounded-full">
                             <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                             <span className="font-bold uppercase tracking-widest text-xs">Recording Active</span>
                         </div>
                     )}
                     <div className="flex items-center space-x-2 text-sm font-medium bg-slate-100 px-3 py-1.5 rounded-lg">
                        <ShieldAlert className={`w-4 h-4 ${warnings > 0 ? 'text-red-500' : 'text-slate-400'}`} />
                        <span className="text-slate-600">Warnings: <span className={`${warnings > 0 ? 'text-red-600 font-bold' : 'text-green-600'}`}>{warnings}/2</span></span>
                     </div>
                 </div>
             </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(79,70,229,0.3)]" 
                    style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                ></div>
            </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-stretch">
            
            {/* Question Text */}
            <div className="space-y-6 flex flex-col">
                <div className="bg-white p-10 rounded-[2rem] shadow-xl border border-slate-200 flex-grow flex items-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600"></div>
                    <p className="text-3xl font-medium text-slate-800 leading-snug">
                        {currentQuestion.text}
                    </p>
                </div>
                
                <div className={`flex items-center justify-between p-6 rounded-2xl border-2 transition-all duration-500 ${
                    phase === 'PREP' ? 'bg-amber-50/50 text-amber-900 border-amber-100' :
                    phase === 'RECORDING' ? 'bg-red-50/50 text-red-900 border-red-100 shadow-red-100 shadow-lg' :
                    'bg-indigo-50/50 text-indigo-900 border-indigo-100'
                }`}>
                    <div className="flex items-center">
                        <div className={`p-3 rounded-xl mr-4 ${
                            phase === 'PREP' ? 'bg-amber-100 text-amber-600' :
                            phase === 'RECORDING' ? 'bg-red-100 text-red-600 animate-pulse' :
                            'bg-indigo-100 text-indigo-600'
                        }`}>
                            {phase === 'PREP' && <Eye className="w-6 h-6" />}
                            {phase === 'RECORDING' && <Mic className="w-6 h-6" />}
                            {phase === 'PROCESSING' && <Loader2 className="w-6 h-6 animate-spin" />}
                        </div>
                        
                        <div>
                            <span className="block text-xs font-bold uppercase tracking-wider opacity-70">Current Phase</span>
                            <span className="font-bold text-xl">
                                {phase === 'PREP' ? 'READING TIME' : 
                                 phase === 'RECORDING' ? 'SPEAK NOW' : 'ANALYZING...'}
                            </span>
                        </div>
                    </div>
                    
                    {phase !== 'PROCESSING' && (
                        <div className="text-right">
                             <span className="block text-xs font-bold uppercase tracking-wider opacity-70">Time Remaining</span>
                             <div className="font-mono text-4xl font-bold tracking-tight">
                                00:{timeLeft.toString().padStart(2, '0')}
                             </div>
                        </div>
                    )}
                </div>
                
                {phase === 'PREP' && (
                    <div className="flex items-center space-x-3 p-4 bg-slate-100 rounded-xl border border-slate-200 text-sm text-slate-600">
                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                        <p>
                            <strong>Preparation Phase:</strong> Read the question carefully. Recording will start automatically in 30 seconds.
                        </p>
                    </div>
                )}
            </div>

            {/* Visualizer & Status */}
            <div className={`flex flex-col items-center justify-center p-8 rounded-[2rem] relative overflow-hidden h-[400px] transition-all duration-500 shadow-inner ${
                phase === 'RECORDING' ? 'bg-slate-900 shadow-2xl scale-[1.02]' : 'bg-slate-100 border-2 border-dashed border-slate-300'
            }`}>
                
                {phase === 'RECORDING' && (
                    <div className="absolute inset-0 opacity-30">
                         <Visualizer stream={mediaStream} isRecording={true} />
                    </div>
                )}
                
                <div className="relative z-10 flex flex-col items-center text-center">
                    {phase === 'PROCESSING' ? (
                         <>
                            <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center mb-6">
                                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                            </div>
                            <h3 className="text-xl font-bold text-indigo-900 mb-2">Analyzing Response</h3>
                            <p className="text-indigo-700/70">Please wait while AI evaluates your answer...</p>
                         </>
                    ) : phase === 'RECORDING' ? (
                        <>
                            <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center mb-6 animate-pulse">
                                <Mic className="w-12 h-12 text-red-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Microphone Active</h3>
                            <p className="text-slate-400">Speak clearly and confidently</p>
                        </>
                    ) : (
                        <>
                            <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center mb-6 shadow-sm">
                                <span className="text-4xl">📖</span>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-700 mb-2">Reading Phase</h3>
                            <p className="text-slate-500">Microphone is OFF</p>
                        </>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default AssessmentSession;
