
import React from 'react';
import { EvaluationResult } from '../types';
import { CheckCircle, ShieldCheck } from 'lucide-react';

interface ResultsProps {
  aptitudeScore: number;
  technicalScore: number;
  communicationResults: EvaluationResult[];
  onRestart: () => void;
}

const Results: React.FC<ResultsProps> = () => {
  // NOTE: Scores are intentionally hidden from the student.
  // They are only visible in the Admin Dashboard.

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50 py-12">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-12 text-center animate-fade-in-up">
        
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
        </div>

        <h1 className="text-3xl font-extrabold text-slate-900 mb-4">Assessment Submitted</h1>
        
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8">
            <p className="text-slate-600 leading-relaxed mb-4">
                Thank you for completing the <strong>Heal Bharat Services</strong> Assessment on the Tronex Platform.
            </p>
            <div className="flex items-center justify-center text-sm text-indigo-600 font-medium">
                <ShieldCheck className="w-4 h-4 mr-2" />
                Your results have been securely recorded.
            </div>
        </div>

        <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-sm font-medium border border-amber-100 mb-8">
            The administrator will review your performance and contact you shortly.
        </div>

        <h2 className="text-xl font-bold text-slate-800">
            You Can Now Close The Window
        </h2>
      </div>
    </div>
  );
};

export default Results;
