
import React, { useEffect, useRef, useState } from 'react';
import { Camera, Clock, FileText, AlertTriangle, ArrowRight, Shield, CheckSquare, Square } from 'lucide-react';

interface InstructionScreenProps {
  title: string;
  duration: string;
  questionCount: number;
  onStart: () => void;
}

const InstructionScreen: React.FC<InstructionScreenProps> = ({ title, duration, questionCount, onStart }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    const getMedia = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      } catch (e) {
        console.error("Camera access failed", e);
      }
    };
    getMedia();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-slate-200">
        
        {/* Left: Camera & Security */}
        <div className="bg-slate-900 md:w-5/12 p-8 text-white flex flex-col relative overflow-hidden justify-between">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-600 rounded-full opacity-20 blur-3xl"></div>
          
          <div className="relative z-10 w-full">
            <div className="flex items-center space-x-2 mb-6">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold">TX</div>
                <h3 className="font-bold tracking-wide uppercase text-sm">Tronex Platform</h3>
            </div>
            
            <h2 className="text-2xl font-bold mb-6">Proctoring Active</h2>
            
            <div className="w-full aspect-video bg-black rounded-xl border-2 border-indigo-500 overflow-hidden shadow-lg mb-6 relative group">
               {stream ? (
                 <video ref={videoRef} autoPlay muted className="w-full h-full object-cover transform scale-x-[-1]" />
               ) : (
                 <div className="flex items-center justify-center h-full text-slate-500 bg-slate-800">
                   <Camera className="w-10 h-10 mb-2 opacity-50" />
                 </div>
               )}
               <div className="absolute top-3 right-3 flex items-center space-x-2 bg-black/60 px-2 py-1 rounded-md backdrop-blur-sm">
                 <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                 <span className="text-[10px] font-bold uppercase text-red-500 tracking-wider">Live Feed</span>
               </div>
            </div>

            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 backdrop-blur-md">
              <div className="flex items-start space-x-3">
                 <Shield className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                 <p className="text-sm text-slate-300 leading-relaxed">
                   AI-Monitoring enabled. Your video and audio feed is being recorded for malpractice detection.
                 </p>
              </div>
            </div>
          </div>
          
          <div className="relative z-10 text-xs text-slate-500 mt-6">
            Session ID: {crypto.randomUUID().split('-')[0]}
          </div>
        </div>

        {/* Right: Instructions */}
        <div className="p-8 md:p-12 md:w-7/12 flex flex-col justify-center bg-white relative">
          <div className="mb-8">
             <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-4 border border-indigo-100">
                Assessment Phase
             </div>
             <h1 className="text-4xl font-extrabold text-slate-900 mb-3">{title}</h1>
             <p className="text-slate-500 text-lg">Read the rules carefully before starting.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
             <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center mb-3">
                    <Clock className="w-5 h-5 text-indigo-600" />
                </div>
                <span className="block text-xs text-slate-400 font-bold uppercase tracking-wider">Duration</span>
                <span className="text-xl font-bold text-slate-900">{duration}</span>
             </div>
             <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center mb-3">
                    <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <span className="block text-xs text-slate-400 font-bold uppercase tracking-wider">Questions</span>
                <span className="text-xl font-bold text-slate-900">{questionCount} MCQ</span>
             </div>
          </div>

          <div className="space-y-4 mb-8">
             <div className="flex items-start space-x-4 p-4 bg-red-50 rounded-xl border border-red-100">
                <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                   <h4 className="font-bold text-red-900 text-sm mb-1">Strict Prohibition Policy</h4>
                   <ul className="text-xs text-red-800 space-y-1 list-disc list-inside">
                      <li>Do not minimize the browser window.</li>
                      <li>Do not switch tabs or open other applications.</li>
                      <li><strong>2 Warnings</strong> will result in an immediate <strong>BLOCK</strong>.</li>
                   </ul>
                </div>
             </div>
          </div>

          <div className="border-t border-slate-100 pt-6 mt-auto">
             <label className="flex items-center space-x-3 cursor-pointer group mb-6 select-none">
                <div 
                    onClick={() => setAgreed(!agreed)}
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${agreed ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 group-hover:border-indigo-400'}`}
                >
                    {agreed && <CheckSquare className="w-4 h-4 text-white" />}
                </div>
                <span className={`text-sm font-medium ${agreed ? 'text-slate-900' : 'text-slate-500'}`}>
                    I agree to the rules and ready to start.
                </span>
             </label>

             <button 
                onClick={onStart}
                disabled={!agreed}
                className={`w-full py-4 font-bold rounded-xl shadow-lg flex items-center justify-center group transition-all duration-300 ${
                    agreed 
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-indigo-500/30 hover:scale-[1.02]' 
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
             >
                Start Assessment
                <ArrowRight className={`w-5 h-5 ml-2 transition-transform ${agreed ? 'group-hover:translate-x-1' : ''}`} />
             </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default InstructionScreen;
