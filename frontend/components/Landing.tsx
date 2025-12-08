

import React from 'react';
import { Mic, Brain, MessageSquare, ChevronRight } from 'lucide-react';

interface LandingProps {
  onStart: () => void;
}

const Landing: React.FC<LandingProps> = ({ onStart }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4 max-w-4xl mx-auto">
      <div className="bg-indigo-50 p-4 rounded-full mb-8 animate-fade-in-up">
        <MessageSquare className="w-12 h-12 text-indigo-600" />
      </div>
      
      <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
        Final Phase: <span className="text-indigo-600">Communication</span>
      </h1>
      
      <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
        You have successfully completed the Aptitude and Technical sections. 
        Now, we will assess your verbal communication skills and professional demeanor using AI analysis.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 w-full text-left">
        <FeatureCard 
          icon={<Brain className="w-6 h-6 text-purple-600" />}
          title="Verbal Reasoning"
          desc="Answer 3 questions speaking clearly into your microphone."
        />
        <FeatureCard 
          icon={<Mic className="w-6 h-6 text-blue-600" />}
          title="AI Analysis"
          desc="Our AI will evaluate grammar, fluency, and confidence."
        />
        <FeatureCard 
          icon={<MessageSquare className="w-6 h-6 text-emerald-600" />}
          title="Video Proctoring"
          desc="Camera must remain active. Do not look away frequently."
        />
      </div>

      <button 
        onClick={onStart}
        className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-indigo-600 rounded-full hover:bg-indigo-700 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600"
      >
        Start Interview
        <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
      </button>
      
      <p className="mt-8 text-sm text-slate-400">Powered by Gemini 2.5 Flash</p>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
    <div className="bg-slate-50 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
      {icon}
    </div>
    <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
    <p className="text-slate-600">{desc}</p>
  </div>
);

export default Landing;
