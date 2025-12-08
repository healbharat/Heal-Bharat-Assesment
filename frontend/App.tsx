
import React, { useState } from 'react';
import Results from './components/Results';
import AccessLogin from './components/AccessLogin';
import StudentForm from './components/StudentForm';
import AdminDashboard from './components/AdminDashboard';
import SystemCheck from './components/SystemCheck';
import MCQSession from './components/MCQSession';
import InstructionScreen from './components/InstructionScreen';
import { EvaluationResult, AppView, StudentProfile } from './types';
import { APTITUDE_QUESTIONS, TECHNICAL_QUESTIONS, COMMUNICATION_QUESTIONS } from './data/staticQuestions';
import { Loader2 } from 'lucide-react';
import { BackendService } from './services/backend';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.ACCESS_CODE);
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Student Data State
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);

  // Scores State
  const [aptitudeScore, setAptitudeScore] = useState(0);
  const [technicalScore, setTechnicalScore] = useState(0);
  const [communicationScore, setCommunicationScore] = useState(0);

  // Setup State
  // Topic and Difficulty are less relevant for static MCQs but kept for record keeping
  const [selectedTopic, setSelectedTopic] = useState("General Professionalism");
  const [difficulty, setDifficulty] = useState("Medium");

  // Navigation Handlers
  const handleAccessSuccess = () => {
    setView(AppView.SYSTEM_CHECK);
  };

  const handleSystemCheckComplete = () => {
    setView(AppView.STUDENT_FORM);
  };

  const handleAdminLogin = () => {
    setView(AppView.ADMIN_DASHBOARD);
  };

  // 1. Submit Profile -> Go to Aptitude Instructions
  const handleStudentSubmit = (profile: StudentProfile) => {
    setStudentProfile(profile);
    setView(AppView.APTITUDE_INSTRUCTIONS);
  };

  // 2. Start Aptitude Test
  const startAptitudeTest = () => {
     requestFullScreen();
     setView(AppView.APTITUDE_TEST);
  };

  // 3. Aptitude Complete -> Go to Technical Instructions
  const handleAptitudeComplete = (score: number) => {
    setAptitudeScore(score);
    setView(AppView.TECHNICAL_INSTRUCTIONS);
  };

  // 4. Start Technical Test
  const startTechnicalTest = () => {
      requestFullScreen();
      setView(AppView.TECHNICAL_TEST);
  };

  // 5. Technical Complete -> Communication Instructions
  const handleTechnicalComplete = (score: number) => {
    setTechnicalScore(score);
    setView(AppView.COMMUNICATION_INSTRUCTIONS);
  };

  // 6. Start Communication Test
  const startCommunicationTest = () => {
      requestFullScreen();
      setView(AppView.COMMUNICATION_TEST);
  };

  // 7. Communication Complete -> Submit and Show Results
  const handleCommunicationComplete = async (score: number) => {
    setCommunicationScore(score);
    setLoading(true);

    if (studentProfile) {
        await BackendService.saveAssessment(
            studentProfile, 
            selectedTopic, 
            difficulty, 
            aptitudeScore,
            technicalScore,
            score, // Communication Score
            [] // No detailed voice results anymore
        );
    }
    setLoading(false);
    setView(AppView.RESULTS);
  };

  const requestFullScreen = () => {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch((err) => {
            console.log("Fullscreen request denied or failed: ", err);
        });
      }
  };

  const handleBlockUser = async () => {
    if (studentProfile) {
        await BackendService.blockUser(studentProfile, "Screen Minimization / Tab Switching");
        
        // Force logout and show alert
        alert("SECURITY VIOLATION: You have been blocked from the Tronex Platform due to repeated screen minimization. Contact Admin.");
        
        setStudentProfile(null);
        setResults([]);
        setAptitudeScore(0);
        setTechnicalScore(0);
        setCommunicationScore(0);
        setView(AppView.ACCESS_CODE);
    }
  };

  const handleRestart = () => {
    setStudentProfile(null);
    setResults([]);
    setAptitudeScore(0);
    setTechnicalScore(0);
    setCommunicationScore(0);
    setView(AppView.ACCESS_CODE);
  };
  
  const handleLogout = () => {
    setStudentProfile(null);
    setResults([]);
    setAptitudeScore(0);
    setTechnicalScore(0);
    setCommunicationScore(0);
    setView(AppView.ACCESS_CODE);
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
         <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mb-4" />
         <h2 className="text-xl font-bold text-slate-800">Processing Results...</h2>
         <p className="text-slate-500 mt-2">Saving assessment data securely.</p>
      </div>
    );
  }

  // Check if we are in an active assessment mode to hide the global header
  const isAssessmentActive = view === AppView.APTITUDE_TEST || view === AppView.TECHNICAL_TEST || view === AppView.COMMUNICATION_TEST;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        {/* Global Header - Hidden during active assessment to prevent text overlap */}
        {!isAssessmentActive && view !== AppView.ACCESS_CODE && view !== AppView.ADMIN_DASHBOARD && (
            <header className="fixed top-0 left-0 right-0 p-4 z-50 pointer-events-none">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center space-x-2 pointer-events-auto">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">TX</div>
                        <span className="font-bold text-slate-800 tracking-tight">Tronex Platform</span>
                    </div>
                    {studentProfile && (
                        <div className="pointer-events-auto flex items-center space-x-4">
                            <span className="text-sm font-medium text-slate-600 hidden sm:inline">{studentProfile.name}</span>
                            <button onClick={handleLogout} className="text-xs text-red-500 hover:underline">Logout</button>
                        </div>
                    )}
                </div>
            </header>
        )}

        {/* View Routing */}
        {view === AppView.ACCESS_CODE && (
            <AccessLogin onSuccess={handleAccessSuccess} onAdminLogin={handleAdminLogin} />
        )}

        {view === AppView.SYSTEM_CHECK && (
            <SystemCheck onComplete={handleSystemCheckComplete} />
        )}

        {view === AppView.STUDENT_FORM && (
            <StudentForm onSubmit={handleStudentSubmit} />
        )}

        {/* Aptitude Instructions */}
        {view === AppView.APTITUDE_INSTRUCTIONS && (
            <InstructionScreen 
                title="Phase 1: Aptitude Test"
                duration="15 Minutes"
                questionCount={15}
                onStart={startAptitudeTest}
            />
        )}

        {/* Aptitude Section: 15 mins */}
        {view === AppView.APTITUDE_TEST && (
            <MCQSession 
                title="Aptitude Assessment" 
                questions={APTITUDE_QUESTIONS}
                durationMinutes={15}
                candidateName={studentProfile?.name || 'Candidate'}
                onComplete={handleAptitudeComplete}
                onBlock={handleBlockUser}
            />
        )}

        {/* Technical Instructions */}
        {view === AppView.TECHNICAL_INSTRUCTIONS && (
            <InstructionScreen 
                title="Phase 2: Technical Test"
                duration="20 Minutes"
                questionCount={20}
                onStart={startTechnicalTest}
            />
        )}

        {/* Technical Section: 20 mins */}
        {view === AppView.TECHNICAL_TEST && (
            <MCQSession 
                title="Technical Assessment" 
                questions={TECHNICAL_QUESTIONS}
                durationMinutes={20}
                candidateName={studentProfile?.name || 'Candidate'}
                onComplete={handleTechnicalComplete}
                onBlock={handleBlockUser}
            />
        )}

        {/* Communication Instructions */}
        {view === AppView.COMMUNICATION_INSTRUCTIONS && (
            <InstructionScreen 
                title="Phase 3: Communication Test"
                duration="20 Minutes"
                questionCount={20}
                onStart={startCommunicationTest}
            />
        )}

        {/* Communication Section: 20 mins (MCQ Based) */}
        {view === AppView.COMMUNICATION_TEST && (
            <MCQSession 
                title="Communication Assessment" 
                questions={COMMUNICATION_QUESTIONS}
                durationMinutes={20}
                candidateName={studentProfile?.name || 'Candidate'}
                onComplete={handleCommunicationComplete}
                onBlock={handleBlockUser}
            />
        )}

        {view === AppView.ADMIN_DASHBOARD && (
            <AdminDashboard onLogout={handleLogout} />
        )}

        {view === AppView.RESULTS && (
             <div className="pt-20 pb-12">
                 <Results 
                    aptitudeScore={aptitudeScore} 
                    technicalScore={technicalScore} 
                    communicationResults={[]} // No detail results for MCQs in this view
                    onRestart={handleRestart} 
                 />
             </div>
        )}
    </div>
  );
};

export default App;
