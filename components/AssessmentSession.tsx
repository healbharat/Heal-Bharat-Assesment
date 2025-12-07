
import React, { useState, useEffect, useRef } from 'react';
import { Question, EvaluationResult } from '../types';
import { evaluateAnswer } from "../services/api";
import { blobToBase64, decodePCM, playAudioBuffer } from '../services/audioUtils';
import Visualizer from './Visualizer';
import { Mic, Loader2, Camera, Eye, ShieldAlert, Play, Type, ArrowRight, Volume2 } from 'lucide-react';

interface AssessmentSessionProps {
  questions: Question[];
  onComplete: (results: EvaluationResult[]) => void;
  onBlock: () => void;
}

const READ_DURATION = 30;
const RECORD_DURATION = 20;

type Phase = 'PREP' | 'RECORDING' | 'PROCESSING' | 'DICTATION_PLAY' | 'DICTATION_TYPE';

const AssessmentSession: React.FC<AssessmentSessionProps> = ({ questions, onComplete, onBlock }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('PREP');
  
  const [timeLeft, setTimeLeft] = useState(READ_DURATION);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [results, setResults] = useState<EvaluationResult[]>([]);
  
  // Security State
  const [warnings, setWarnings] = useState(0);

  // Dictation State
  const [audioPlayed, setAudioPlayed] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const currentQuestion = questions[currentIndex];
  const isDictation = currentQuestion?.type === 'DICTATION';

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
        mediaStreamRef.current = stream; 
      } catch (err) {
          console.error("Media Error:", err);
          alert("Camera and Microphone access is MANDATORY. Please enable permissions and refresh.");
      }
  };

  useEffect(() => {
    if (videoRef.current && mediaStream) {
        videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

  // --- QUESTION FLOW MANAGEMENT ---

  useEffect(() => {
    // Reset state for new question
    setAudioPlayed(false);
    setTypedAnswer('');
    setIsPlayingAudio(false);

    if (isDictation) {
        setPhase('DICTATION_PLAY');
        setTimeLeft(60); // 60 seconds to listen and type
        if (timerRef.current) clearInterval(timerRef.current);
    } else {
        startPrepPhase();
    }
    
    return () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  // --- VERBAL LOGIC ---

  const startPrepPhase = () => {
      setPhase('PREP');
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

  const startRecordingPhase = () => {
    setPhase('RECORDING');
    setTimeLeft(RECORD_DURATION);

    if (!mediaStreamRef.current) {
        console.error("No stream available");
        return; 
    }
    
    // Check supported types
    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';

    const mediaRecorder = new MediaRecorder(mediaStreamRef.current, { mimeType });
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
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType }); 
        await processVerbalAnswer(blob, mimeType);
      };
    }
  };

  const processVerbalAnswer = async (audioBlob: Blob, mimeType: string) => {
    try {
      const base64Audio = await blobToBase64(audioBlob);
      const evaluation = await evaluateAnswer(currentQuestion, base64Audio, mimeType);
      handleResult(evaluation);
    } catch (error) {
        console.error("Evaluation failed", error);
        alert(`Error processing answer: ${error instanceof Error ? error.message : "Unknown Error"}`);
        // Skip on error
        const emptyResult: EvaluationResult = {
            questionId: currentQuestion.id,
            transcription: "Error processing audio",
            overallScore: 0,
            clarity: { score: 0, reasoning: "Error" },
            confidence: { score: 0, reasoning: "Error" },
            contentQuality: { score: 0, reasoning: "Error" },
            grammarAndFluency: { score: 0, reasoning: "Error" },
            keyTakeaways: [],
            improvementTips: []
        };
        handleResult(emptyResult);
    }
  };

  // --- DICTATION LOGIC ---

  const handlePlayAudio = async () => {
      if (audioPlayed || !currentQuestion.audioBase64) return;
      
      setIsPlayingAudio(true);
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      try {
          if (audioCtx.state === 'suspended') {
              await audioCtx.resume();
          }

          // Decode Base64 string to ArrayBuffer
          const binaryString = atob(currentQuestion.audioBase64);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
          }
          
          // Decode Audio Data using manual PCM decoding (Gemini returns 24kHz raw PCM)
          // Do NOT use audioCtx.decodeAudioData as it expects WAV/MP3 headers
          const audioBuffer = decodePCM(bytes, audioCtx, 24000);

          playAudioBuffer(audioBuffer, audioCtx, () => {
              setIsPlayingAudio(false);
              setAudioPlayed(true);
              setPhase('DICTATION_TYPE');
          });
      } catch (e) {
          console.error("Audio Play Error", e);
          alert("Failed to play audio. Error decoding data.");
          setIsPlayingAudio(false);
          setAudioPlayed(true); // Prevent stuck state
      }
  };

  const submitDictation = () => {
      // Calculate Score: Simple text similarity (Levenshtein-ish or word overlap)
      const target = currentQuestion.text.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");
      const input = typedAnswer.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");
      
      const targetWords = target.split(/\s+/);
      const inputWords = input.split(/\s+/);
      
      let matches = 0;
      inputWords.forEach(w => {
          if (targetWords.includes(w)) matches++;
      });
      
      // Calculate Percentage
      let score = Math.round((matches / targetWords.length) * 100);
      if (score > 100) score = 100;

      const result: EvaluationResult = {
        questionId: currentQuestion.id,
        transcription: typedAnswer,
        overallScore: score,
        clarity: { score: score, reasoning: "N/A for Dictation" },
        confidence: { score: score, reasoning: "N/A for Dictation" },
        contentQuality: { score: score, reasoning: `Matched ${matches}/${targetWords.length} words.` },
        grammarAndFluency: { score: score, reasoning: "N/A for Dictation" },
        keyTakeaways: ["Listening Accuracy"],
        improvementTips: ["Practice typing faster"]
      };

      handleResult(result);
  };

  // --- SHARED COMPLETION ---

  const handleResult = (result: EvaluationResult) => {
      const newResults = [...results, result];
      setResults(newResults);

      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        onComplete(newResults);
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
                     <span className={`font-bold text-xs uppercase tracking-wider px-2 py-1 rounded-md ${isDictation ? 'bg-purple-100 text-purple-700' : 'bg-indigo-50 text-indigo-600'}`}>
                         {isDictation ? 'Audio Dictation Test' : 'Verbal Assessment'}
                     </span>
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
                    className={`h-2 rounded-full transition-all duration-500 ${isDictation ? 'bg-purple-600' : 'bg-indigo-600'}`} 
                    style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                ></div>
            </div>
        </div>

        {isDictation ? (
            /* --- DICTATION UI --- */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-stretch">
                <div className="flex flex-col space-y-6">
                    <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-200 flex-grow relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 h-full bg-purple-600"></div>
                        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                            <Volume2 className="w-6 h-6 mr-2 text-purple-600" />
                            Listening Test
                        </h3>
                        <p className="text-slate-600 text-lg leading-relaxed mb-8">
                            Listen to the audio clip exactly <strong>once</strong> and type what you hear in the box provided. Accuracy is key.
                        </p>
                        
                        <div className="flex justify-center">
                            <button
                                onClick={handlePlayAudio}
                                disabled={audioPlayed || isPlayingAudio}
                                className={`w-full py-8 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                                    audioPlayed 
                                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                    : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 hover:scale-[1.02] cursor-pointer'
                                }`}
                            >
                                {isPlayingAudio ? (
                                    <>
                                        <Loader2 className="w-10 h-10 mb-2 animate-spin" />
                                        <span className="font-bold">Playing... Listen carefully!</span>
                                    </>
                                ) : audioPlayed ? (
                                    <>
                                        <Volume2 className="w-10 h-10 mb-2" />
                                        <span className="font-bold">Audio Played</span>
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-12 h-12 mb-2 fill-current" />
                                        <span className="font-bold text-lg">Play Audio (1 Attempt)</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200 flex flex-col">
                    <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center">
                        <Type className="w-4 h-4 mr-2" />
                        Type your answer below
                    </label>
                    <textarea 
                        className="w-full flex-grow p-6 rounded-xl border border-slate-300 focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none text-lg resize-none shadow-inner"
                        placeholder="Waiting for audio..."
                        disabled={!audioPlayed && !isPlayingAudio}
                        value={typedAnswer}
                        onChange={(e) => setTypedAnswer(e.target.value)}
                    ></textarea>
                    
                    <button 
                        onClick={submitDictation}
                        disabled={typedAnswer.length < 5}
                        className="mt-6 w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center"
                    >
                        Submit Answer <ArrowRight className="w-5 h-5 ml-2" />
                    </button>
                </div>
            </div>
        ) : (
            /* --- VERBAL UI (Existing) --- */
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
        )}
    </div>
  );
};

export default AssessmentSession;
