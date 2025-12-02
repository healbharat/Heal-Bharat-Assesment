
import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, Monitor, Mic, Camera, Wifi, ArrowRight, ShieldCheck } from 'lucide-react';

interface SystemCheckProps {
  onComplete: () => void;
}

type CheckStatus = 'pending' | 'loading' | 'success' | 'error';

export const SystemCheck: React.FC<SystemCheckProps> = ({ onComplete }) => {
  const [fullscreenStatus, setFullscreenStatus] = useState<CheckStatus>('pending');
  const [cameraStatus, setCameraStatus] = useState<CheckStatus>('pending');
  const [micStatus, setMicStatus] = useState<CheckStatus>('pending');
  const [networkStatus, setNetworkStatus] = useState<CheckStatus>('pending');
  
  const [isRunning, setIsRunning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const allPassed = fullscreenStatus === 'success' && cameraStatus === 'success' && micStatus === 'success' && networkStatus === 'success';

  const runDiagnostics = async () => {
    setIsRunning(true);
    
    // 1. Network Check
    setNetworkStatus('loading');
    setTimeout(() => {
        setNetworkStatus(navigator.onLine ? 'success' : 'error');
    }, 500);

    // 2. Fullscreen Check
    setFullscreenStatus('loading');
    try {
        if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
        }
        setFullscreenStatus('success');
    } catch (e) {
        console.error("Fullscreen denied", e);
        setFullscreenStatus('error');
    }

    // 3. Media Check
    setCameraStatus('loading');
    setMicStatus('loading');
    
    try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(mediaStream);
        
        if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
        }

        // Slight delay to simulate checking
        setTimeout(() => {
            const videoTrack = mediaStream.getVideoTracks()[0];
            const audioTrack = mediaStream.getAudioTracks()[0];

            if (videoTrack && videoTrack.readyState === 'live') {
                setCameraStatus('success');
            } else {
                setCameraStatus('error');
            }

            if (audioTrack && audioTrack.readyState === 'live') {
                setMicStatus('success');
            } else {
                setMicStatus('error');
            }
        }, 1500);

    } catch (e) {
        console.error("Media access denied", e);
        setCameraStatus('error');
        setMicStatus('error');
    }
  };

  const CheckItem = ({ 
    icon: Icon, 
    label, 
    status, 
    desc 
  }: { 
    icon: React.ElementType, 
    label: string, 
    status: CheckStatus, 
    desc: string 
  }) => (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center space-x-4">
            <div className={`p-2 rounded-lg ${
                status === 'success' ? 'bg-green-100' :
                status === 'error' ? 'bg-red-100' :
                status === 'loading' ? 'bg-indigo-100' : 'bg-slate-200'
            }`}>
                <Icon className={`w-6 h-6 ${
                    status === 'success' ? 'text-green-600' :
                    status === 'error' ? 'text-red-600' :
                    status === 'loading' ? 'text-indigo-600' : 'text-slate-500'
                }`} />
            </div>
            <div>
                <h4 className="font-bold text-slate-900">{label}</h4>
                <p className="text-sm text-slate-500">{desc}</p>
            </div>
        </div>
        <div className="flex-shrink-0">
            {status === 'pending' && <div className="w-6 h-6 rounded-full border-2 border-slate-300" />}
            {status === 'loading' && <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />}
            {status === 'success' && <CheckCircle className="w-6 h-6 text-green-500" />}
            {status === 'error' && <XCircle className="w-6 h-6 text-red-500" />}
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden flex flex-col md:flex-row">
        
        {/* Left: Info */}
        <div className="bg-indigo-900 p-8 text-white md:w-1/3 flex flex-col justify-between">
            <div>
                <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-6">
                    <ShieldCheck className="w-6 h-6 text-indigo-300" />
                </div>
                <h2 className="text-2xl font-bold mb-4">System Check</h2>
                <p className="text-indigo-200 text-sm leading-relaxed mb-6">
                    Before we begin, we need to verify your hardware and environment to ensure a fair assessment.
                </p>
                <div className="space-y-3 text-sm text-indigo-300">
                    <p>• Mandatory Full Screen</p>
                    <p>• Functional Webcam</p>
                    <p>• Clear Microphone Input</p>
                    <p>• Stable Internet</p>
                </div>
            </div>
            <div className="mt-8 pt-6 border-t border-indigo-800 text-xs text-indigo-400">
                Tronex Platform v2.1
            </div>
        </div>

        {/* Right: Actions */}
        <div className="p-8 md:w-2/3 flex flex-col">
            <div className="flex-grow space-y-4 mb-8">
                <CheckItem 
                    icon={Monitor} 
                    label="Full Screen Mode" 
                    desc="Required for anti-cheat enforcement"
                    status={fullscreenStatus} 
                />
                <CheckItem 
                    icon={Wifi} 
                    label="Network Connection" 
                    desc="Stable link to Tronex servers"
                    status={networkStatus} 
                />
                <CheckItem 
                    icon={Camera} 
                    label="Webcam Access" 
                    desc="Live proctoring feed"
                    status={cameraStatus} 
                />
                <CheckItem 
                    icon={Mic} 
                    label="Microphone Access" 
                    desc="Audio recording capability"
                    status={micStatus} 
                />
            </div>

            {/* Camera Preview */}
            {stream && (
                <div className="mb-6 rounded-xl overflow-hidden bg-black border border-slate-200 h-32 w-full relative">
                     <video ref={videoRef} autoPlay muted className="w-full h-full object-cover transform scale-x-[-1]" />
                     <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 text-white text-xs rounded-md flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                        Live Feed
                     </div>
                </div>
            )}

            <div className="flex justify-end">
                {!isRunning ? (
                    <button 
                        onClick={runDiagnostics}
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center"
                    >
                        Initialize System
                        <ArrowRight className="w-5 h-5 ml-2" />
                    </button>
                ) : (
                    <button 
                        onClick={onComplete}
                        disabled={!allPassed}
                        className={`px-8 py-3 font-bold rounded-xl shadow-lg transition-all flex items-center ${
                            allPassed 
                            ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer' 
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                    >
                        {allPassed ? 'Proceed to Registration' : 'Running Checks...'}
                        {allPassed && <ArrowRight className="w-5 h-5 ml-2" />}
                    </button>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default SystemCheck;
