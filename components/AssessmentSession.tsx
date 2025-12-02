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

  // --- INITIALIZATION ---

  useEffect(() => {
    initMedia();

    const handleVisibilityChange = () => {
      if (document.hidden) handleSecurityViolation();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(track => track.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleSecurityViolation = () => {
    setWarnings(prev => {
      const newCount = prev + 1;
      if (newCount === 1) {
        alert("WARNING (1/2): Screen minimization detected. Do not switch tabs!");
      } else if (newCount >= 2) {
        onBlock();
      }
      return newCount;
    });
  };

  // --- MEDIA INIT FIXED ---
  const initMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });

      if (!stream.getAudioTracks().length) {
        alert("Microphone not detected. Enable mic permission.");
        return;
      }

      setMediaStream(stream);
      mediaStreamRef.current = stream;

    } catch (err) {
      console.error("Media Error:", err);
      alert("Camera & Microphone permission required. Enable both & refresh.");
    }
  };

  // VIDEO FEED UPDATE
  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

  // --- QUESTION FLOW ---

  useEffect(() => {
    startPrepPhase();
    return () => timerRef.current && clearInterval(timerRef.current);
  }, [currentIndex]);

  const startPrepPhase = () => {
    setPhase("PREP");
    setTimeLeft(READ_DURATION);

    timerRef.current && clearInterval(timerRef.current);
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

  // --- RECORDING FIXED VERSION ---
  const startRecordingPhase = () => {
    setPhase("RECORDING");
    setTimeLeft(RECORD_DURATION);

    const stream = mediaStreamRef.current;

    if (!stream) {
      alert("Microphone not ready. Allow permissions.");
      return;
    }

    if (!stream.getAudioTracks().length) {
      alert("No audio track found. Enable microphone.");
      return;
    }

    // Supported MIME types
    let mimeType = "";
    if (MediaRecorder.isTypeSupported("audio/webm")) mimeType = "audio/webm";
    else if (MediaRecorder.isTypeSupported("audio/ogg")) mimeType = "audio/ogg";
    else if (MediaRecorder.isTypeSupported("audio/mp4")) mimeType = "audio/mp4";
    else {
      alert("Your browser cannot record audio. Use Chrome/Edge.");
      return;
    }

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType });
    } catch (err) {
      console.error("Recorder Error:", err);
      alert("Error starting microphone. Check permissions.");
      return;
    }

    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = e => e.data.size > 0 && chunksRef.current.push(e.data);

    recorder.start();

    // Recording timer
    timerRef.current && clearInterval(timerRef.current);
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
    timerRef.current && clearInterval(timerRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setPhase("PROCESSING");

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current);
        await processAnswer(blob);
      };
    }
  };

  const processAnswer = async (audioBlob: Blob) => {
    try {
      const base64 = await blobToBase64(audioBlob);
      const mime = audioBlob.type || "audio/webm";
      const evaluation = await evaluateAnswer(currentQuestion, base64, mime);

      const updated = [...results, evaluation];
      setResults(updated);

      if (currentIndex < questions.length - 1) {
        setCurrentIndex(i => i + 1);
      } else {
        onComplete(updated);
      }
    } catch (err) {
      console.error("Evaluation Error:", err);
      alert("Error processing answer. Moving to next.");

      if (currentIndex < questions.length - 1) {
        setCurrentIndex(i => i + 1);
      } else {
        onComplete(results);
      }
    }
  };

  // ---------------- UI BELOW (UNCHANGED) ----------------

  return (
    <div className="max-w-6xl mx-auto w-full px-6 h-full flex flex-col justify-center relative font-sans">
        
        {/* Floating Camera */}
        <div className="fixed bottom-6 right-6 z-50">
             <div className="w-32 h-32 rounded-full border-4 border-indigo-600 shadow-2xl overflow-hidden bg-black relative">
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
             <p className="text-center text-xs text-indigo-900 font-bold mt-2 uppercase tracking-wider bg-white/80 backdrop-blur px-2 py-1 rounded-full">
                Live Feed
             </p>
        </div>

        {/* HEADER */}
        <div className="mb-8">
             <div className="flex justify-between items-end mb-4">
                 <div>
                     <span className="text-indigo-600 font-bold text-xs uppercase tracking-wider bg-indigo-50 px-2 py-1 rounded-md">Verbal Assessment</span>
                     <h2 className="text-3xl font-extrabold text-slate-900 mt-2">
                         Question {currentIndex + 1} / {questions.length}
                     </h2>
                 </div>

                 <div className="flex flex-col items-end">
                     {phase === 'RECORDING' && (
                         <div className="flex items-center text-red-600 animate-pulse mb-2 bg-red-50 px-3 py-1 rounded-full">
                             <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                             <span className="font-bold text-xs ml-2">Recording Active</span>
                         </div>
                     )}

                     <div className="flex items-center space-x-2 text-sm bg-slate-100 px-3 py-1.5 rounded-lg">
                        <ShieldAlert className={`w-4 h-4 ${warnings > 0 ? 'text-red-500' : 'text-slate-400'}`} />
                        <span>Warnings: <b className={warnings > 0 ? "text-red-600" : "text-green-600"}>{warnings}/2</b></span>
                     </div>
                 </div>
             </div>

            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all" 
                    style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                ></div>
            </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            
            {/* QUESTION */}
            <div className="space-y-6">
                <div className="bg-white p-10 rounded-[2rem] shadow-xl border flex items-center relative">
                    <div className="absolute left-0 top-0 w-2 h-full bg-indigo-600"></div>
                    <p className="text-3xl font-medium text-slate-800">{currentQuestion.text}</p>
                </div>

                <div className={`p-6 rounded-2xl border-2 transition-all
                    ${phase === "PREP" ? "bg-amber-50 text-amber-900" :
                      phase === "RECORDING" ? "bg-red-50 text-red-900" :
                      "bg-indigo-50 text-indigo-900"}`}>
                    
                    <div className="flex items-center">
                        <div className="p-3 rounded-xl mr-4 bg-slate-200">
                            {phase === "PREP" && <Eye className="w-6 h-6 text-amber-600" />}
                            {phase === "RECORDING" && <Mic className="w-6 h-6 text-red-600" />}
                            {phase === "PROCESSING" && <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />}
                        </div>

                        <div>
                            <span className="text-xs font-bold">Current Phase</span>
                            <div className="font-bold text-xl">
                                {phase === "PREP" ? "READING" :
                                 phase === "RECORDING" ? "SPEAK NOW" :
                                 "ANALYZING..."}
                            </div>
                        </div>
                    </div>

                    {phase !== "PROCESSING" && (
                      <div className="text-right">
                        <span className="text-xs font-bold">Time Remaining</span>
                        <div className="font-mono text-4xl font-bold">
                          00:{timeLeft.toString().padStart(2, "0")}
                        </div>
                      </div>
                    )}
                </div>

                {phase === "PREP" && (
                  <div className="flex items-center p-4 bg-slate-100 rounded-xl border text-sm">
                    <AlertTriangle className="w-5 h-5 text-amber-500 mr-3" />
                    <p>Read the question carefully. Recording begins automatically.</p>
                  </div>
                )}
            </div>

            {/* VISUALIZER */}
            <div className={`p-8 rounded-[2rem] relative overflow-hidden h-[400px] 
                ${phase === "RECORDING" ? "bg-slate-900 shadow-xl" : "bg-slate-100 border-dashed border-2"}`}>
                
                {phase === "RECORDING" && (
                  <div className="absolute inset-0 opacity-30">
                      <Visualizer stream={mediaStream} isRecording />
                  </div>
                )}

                <div className="relative z-10 text-center">
                  {phase === "PROCESSING" ? (
                    <>
                      <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-6">
                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                      </div>
                      <h3 className="text-xl font-bold text-indigo-900">Analyzing Response</h3>
                    </>
                  ) : phase === "RECORDING" ? (
                    <>
                      <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6 animate-pulse">
                        <Mic className="w-12 h-12 text-red-500" />
                      </div>
                      <h3 className="text-2xl font-bold text-white">Microphone Active</h3>
                    </>
                  ) : (
                    <>
                      <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center mx-auto mb-6">
                        📖
                      </div>
                      <h3 className="text-2xl font-bold text-slate-700">Reading Phase</h3>
                    </>
                  )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default AssessmentSession;
