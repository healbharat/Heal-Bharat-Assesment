import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  stream: MediaStream | null;
  isRecording: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ stream, isRecording }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (!stream || !isRecording || !canvasRef.current) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    
    analyser.fftSize = 256;
    source.connect(analyser);
    
    analyserRef.current = analyser;
    const bufferLength = analyser.frequencyBinCount;
    dataArrayRef.current = new Uint8Array(bufferLength);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (!isRecording) return;
      
      const width = canvas.width;
      const height = canvas.height;
      
      animationRef.current = requestAnimationFrame(draw);
      
      if (analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0)'; // Clear transparent
        ctx.clearRect(0, 0, width, height);
        
        const barWidth = (width / dataArrayRef.current.length) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < dataArrayRef.current.length; i++) {
          barHeight = dataArrayRef.current[i] / 2;
          
          // Gradient fill
          const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
          gradient.addColorStop(0, '#6366f1'); // Indigo 500
          gradient.addColorStop(1, '#a5b4fc'); // Indigo 300
          
          ctx.fillStyle = gradient;
          ctx.fillRect(x, height - barHeight, barWidth, barHeight);
          
          x += barWidth + 1;
        }
      }
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContext.state !== 'closed') audioContext.close();
    };
  }, [stream, isRecording]);

  return (
    <canvas 
      ref={canvasRef} 
      width={300} 
      height={100} 
      className="w-full h-24 rounded-lg bg-slate-50/50 border border-slate-200"
    />
  );
};

export default Visualizer;