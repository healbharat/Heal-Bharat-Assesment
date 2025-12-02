import React, { useState } from 'react';
import { User, Mail, Phone, ArrowRight, AlertOctagon } from 'lucide-react';
import { StudentProfile } from '../types';
import { BackendService } from '../services/backend';

interface StudentFormProps {
  onSubmit: (profile: StudentProfile) => void;
}

const StudentForm: React.FC<StudentFormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState<StudentProfile>({
    name: '',
    email: '',
    phone: ''
  });
  const [error, setError] = useState<string>('');
  const [checking, setChecking] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.email && formData.phone) {
        setChecking(true);
        try {
            const isBlocked = await BackendService.isUserBlocked(formData.email);
            if (isBlocked) {
                setError("Your account has been BLOCKED due to security violations. Please contact the Admin to unlock your account.");
            } else {
                onSubmit(formData);
            }
        } catch (e) {
            setError("Network error checking status.");
        } finally {
            setChecking(false);
        }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 animate-fade-in-up">
        <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Candidate Registration</h2>
            <p className="text-slate-500 mt-2">Please provide your details to proceed.</p>
        </div>

        {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <AlertOctagon className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="pl-10 w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Full Name"
                />
            </div>

            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10 w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Email Address"
                />
            </div>

            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-slate-400" />
                </div>
                <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="pl-10 w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Phone Number"
                />
            </div>

            <button
              type="submit"
              disabled={checking}
              className="w-full py-4 mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center"
            >
              {checking ? "Checking Status..." : "Continue to Assessment"}
              {!checking && <ArrowRight className="w-5 h-5 ml-2" />}
            </button>
        </form>
      </div>
    </div>
  );
};

export default StudentForm;