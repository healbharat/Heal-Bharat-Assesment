
import React, { useState } from 'react';
import Landing from './components/Landing';
import AssessmentSession from './components/AssessmentSession';
import Results from './components/Results';
import AccessLogin from './components/AccessLogin';
import StudentForm from './components/StudentForm';
import AdminDashboard from './components/AdminDashboard';
import SystemCheck from './components/SystemCheck';
import MCQSession from './components/MCQSession';
import InstructionScreen from './components/InstructionScreen';
import { generateQuestions } from './services/gemini';
import { Question, EvaluationResult, AppView, StudentProfile } from './types';
import { APTITUDE_QUESTIONS, TECHNICAL_QUESTIONS } from './data/staticQuestions';
import { Loader2, Settings, Monitor, ShieldBan } from 'lucide-react';
import { BackendService } from './services/backend.ts';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.ACCESS_CODE);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Student Data State
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);

  // Scores State
  const [aptitudeScore, setAptitudeScore] = useState(0);
  const [technicalScore, setTechnicalScore] = useState(0);

  // Setup State
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

  // 5. Technical Complete -> Landing (Intro to Communication)
  const handleTechnicalComplete = (score: number) => {
    setTechnicalScore(score);
    setView(AppView.LANDING);
  };

  const requestFullScreen = () => {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch((err) => {
            console.log("Fullscreen request denied or failed: ", err);
        });
      }
  };

  const startAssessment = async () => {
    // Ensure fullscreen is active
    if (!document.fullscreenElement) {
        requestFullScreen();
    }

    setLoading(true);
    setView(AppView.SETUP); 
    
    try {
      const generatedQuestions = await generateQuestions(selectedTopic, difficulty, 3);
      setQuestions(generatedQuestions);
      setResults([]);
      setLoading(false);
      setView(AppView.ASSESSMENT);
    } catch (error) {
      console.error("Failed to start", error);
      setLoading(false);
      alert("Could not generate questions. Please check your connection or API key.");
      setView(AppView.LANDING);
    }
  };

  const handleAssessmentComplete = async (finalResults: EvaluationResult[]) => {
    setResults(finalResults);
    
    if (studentProfile) {
        await BackendService.saveAssessment(
            studentProfile, 
            selectedTopic, 
            difficulty, 
            aptitudeScore,
            technicalScore,
            finalResults
        );
    }
    
    setView(AppView.RESULTS);
  };

  const handleBlockUser = async () => {
    if (studentProfile) {
        await BackendService.blockUser(studentProfile, "Screen Minimization / Tab Switching");
        
        // Force logout and show alert
        alert("SECURITY VIOLATION: You have been blocked from the Tronex Platform due to repeated screen minimization. Contact Admin.");
        
        setStudentProfile(null);
        setQuestions([]);
        setResults([]);
        setAptitudeScore(0);
        setTechnicalScore(0);
        setView(AppView.ACCESS_CODE);
    }
  };

  const handleRestart = () => {
    setStudentProfile(null);
    setQuestions([]);
    setResults([]);
    setAptitudeScore(0);
    setTechnicalScore(0);
    setView(AppView.ACCESS_CODE);
  };
  
  const handleLogout = () => {
    setStudentProfile(null);
    setQuestions([]);
    setResults([]);
    setAptitudeScore(0);
    setTechnicalScore(0);
    setView(AppView.ACCESS_CODE);
  };

  // Loading Screen
  if (view === AppView.SETUP && loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
         <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mb-4" />
         <h2 className="text-xl font-bold text-slate-800">Tronex AI is Preparing...</h2>
         <p className="text-slate-500 mt-2">Generating personalized questions</p>
      </div>
    );
  }

  // Topic Config Component
  const ShowSetup = () => (
     <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
            <div className="text-center mb-8">
                <div className="inline-flex p-3 bg-indigo-50 rounded-full mb-4">
                    <Settings className="w-8 h-8 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Communication Setup</h2>
                {studentProfile && (
                    <p className="text-slate-500 mt-2">Candidate: {studentProfile.name}</p>
                )}
            </div>
            
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Topic</label>
                    <select 
                        value={selectedTopic}
                        onChange={(e) => setSelectedTopic(e.target.value)}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                        <option value="General Professionalism">General Professionalism</option>
                        <option value="Software Engineering">Software Engineering</option>
                        <option value="Product Management">Product Management</option>
                        <option value="Sales & Marketing">Sales & Marketing</option>
                        <option value="Leadership">Leadership & Conflict</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Difficulty</label>
                    <div className="grid grid-cols-3 gap-3">
                        {['Easy', 'Medium', 'Hard'].map((diff) => (
                            <button
                                key={diff}
                                onClick={() => setDifficulty(diff)}
                                className={`py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                                    difficulty === diff 
                                    ? 'bg-indigo-600 text-white shadow-md' 
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {diff}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 text-sm text-yellow-800 flex items-start">
                    <Monitor className="w-5 h-5 mr-2 flex-shrink-0" />
                    <p>Assessment requires full-screen mode. Camera and Microphone must be enabled. Do not switch tabs.</p>
                </div>

                <button 
                    onClick={startAssessment}
                    className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg mt-4"
                >
                    Start Communication Test
                </button>
            </div>
        </div>
     </div>
  );

  // Check if we are in an active assessment mode to hide the global header
  const isAssessmentActive = view === AppView.APTITUDE_TEST || view === AppView.TECHNICAL_TEST;

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

        {view === AppView.ADMIN_DASHBOARD && (
            <AdminDashboard onLogout={handleLogout} />
        )}

        {view === AppView.LANDING && (
            <Landing onStart={() => setView(AppView.SETUP)} />
        )}
        
        {view === AppView.SETUP && !loading && <ShowSetup />}
        
        {view === AppView.ASSESSMENT && (
            <div className="h-screen pt-12 pb-4">
                <AssessmentSession 
                    questions={questions} 
                    onComplete={handleAssessmentComplete}
                    onBlock={handleBlockUser}
                />
            </div>
        )}
        
        {view === AppView.RESULTS && (
             <div className="pt-20 pb-12">
                 <Results 
                    aptitudeScore={aptitudeScore} 
                    technicalScore={technicalScore} 
                    communicationResults={results} 
                    onRestart={handleRestart} 
                 />
             </div>
        )}
    </div>
  );
};

export default App;
