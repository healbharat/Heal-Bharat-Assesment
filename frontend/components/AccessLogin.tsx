
import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldCheck, X, AlertTriangle, Eye, Mic, Monitor, Ban } from 'lucide-react';
import { BackendService } from '../services/backend';

interface AccessLoginProps {
  onSuccess: () => void;
  onAdminLogin: () => void;
}

const AccessLogin: React.FC<AccessLoginProps> = ({ onSuccess, onAdminLogin }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  
  // Admin Credentials State
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminError, setAdminError] = useState('');

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (BackendService.verifyAccessCode(code)) {
      onSuccess();
    } else {
      setError('Invalid Access Code. Please try again.');
    }
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminEmail === 'sonawaneom191@gmail.com' && adminPass === 'Shambhu@3266992') {
        onAdminLogin();
    } else {
        setAdminError('Invalid Email or Password.');
    }
  };

  if (showAdminLogin) {
      return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-slate-800 overflow-hidden relative">
                <button 
                    onClick={() => setShowAdminLogin(false)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                >
                    <X className="w-6 h-6" />
                </button>
                <div className="bg-indigo-900 p-8 text-center">
                    <ShieldCheck className="mx-auto w-12 h-12 text-indigo-300 mb-4" />
                    <h1 className="text-2xl font-bold text-white">Admin Access</h1>
                    <p className="text-indigo-200 mt-2">Tronex Platform Control</p>
                </div>
                <div className="p-8">
                    <form onSubmit={handleAdminSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email ID</label>
                            <input
                                type="email"
                                value={adminEmail}
                                onChange={(e) => setAdminEmail(e.target.value)}
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                placeholder="admin@tronex.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                            <input
                                type="password"
                                value={adminPass}
                                onChange={(e) => setAdminPass(e.target.value)}
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                placeholder="••••••••"
                            />
                        </div>
                        {adminError && <p className="text-red-500 text-sm font-medium">{adminError}</p>}
                        <button
                            type="submit"
                            className="w-full py-3 bg-indigo-900 hover:bg-indigo-800 text-white font-bold rounded-lg shadow-md transition-all"
                        >
                            Login
                        </button>
                    </form>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        
        {/* Left Side: Rules & Conditions */}
        <div className="bg-slate-900 p-8 text-white flex flex-col justify-between relative overflow-hidden">
             {/* Decorative Background */}
             <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-600 rounded-full opacity-20 blur-3xl"></div>
             
             <div>
                <h3 className="text-indigo-400 font-bold tracking-widest uppercase text-sm mb-2">As You Wish</h3>
                <h2 className="text-3xl font-bold mb-6">Assessment Rules</h2>
                
                <div className="space-y-6">
                    <div className="flex items-start space-x-4">
                        <div className="p-2 bg-indigo-500/20 rounded-lg">
                            <Monitor className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-100">Full Screen Mandatory</h4>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                The assessment requires full screen. Minimizing the window or switching tabs is strictly prohibited.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-4">
                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                            <Eye className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-100">Smart Timing</h4>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                <strong className="text-white">30s Reading</strong> (Mic Off) followed by <strong className="text-white">20s Recording</strong> (Mic On). Auto-submits.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-4">
                        <div className="p-2 bg-red-500/20 rounded-lg">
                            <Ban className="w-6 h-6 text-red-400" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-100">Security & Blocking</h4>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                <span className="text-red-400 font-bold">1st Warning:</span> Alert.<br/>
                                <span className="text-red-400 font-bold">2nd Warning:</span> Account Blocked.<br/>
                                Only Admin can unblock.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-4">
                        <div className="p-2 bg-amber-500/20 rounded-lg">
                            <AlertTriangle className="w-6 h-6 text-amber-400" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-100">Hardware Check</h4>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                A mandatory system check will verify Camera, Audio, and Screen status before registration.
                            </p>
                        </div>
                    </div>
                </div>
             </div>
             
             <div className="mt-8 pt-6 border-t border-slate-700/50 text-xs text-slate-500">
                By entering the code, you agree to these terms.
             </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="p-8 md:p-12 flex flex-col justify-center bg-white relative">
            <div className="mb-8">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6">
                    <Lock className="w-8 h-8 text-indigo-600" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Tronex Platform</h1>
                <p className="text-slate-500 mt-2">Enter your access code to begin.</p>
            </div>

            <form onSubmit={handleStudentSubmit} className="space-y-6">
                <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Access Code
                </label>
                <input
                    type="text"
                    value={code}
                    onChange={(e) => {
                        setCode(e.target.value);
                        setError('');
                    }}
                    placeholder="assess-healbharat"
                    className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none text-lg"
                />
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </div>

                <button
                type="submit"
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center group"
                >
                Start System Check
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
            </form>

            <div className="mt-8 text-center border-t border-slate-100 pt-6">
                <button 
                    onClick={() => setShowAdminLogin(true)}
                    className="text-xs text-slate-400 hover:text-slate-600 flex items-center justify-center mx-auto transition-colors"
                >
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    Admin Login
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AccessLogin;
