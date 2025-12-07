import { AssessmentRecord, StudentProfile, EvaluationResult } from '../types';

const USE_REAL_BACKEND = true;

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

export const BackendService = {

  verifyAccessCode: (code: string): boolean => {
    return code === 'assess-healbharat';
  },

  saveAssessment: async (profile, topic, difficulty, aptitudeScore, technicalScore, communicationResults) => {
    try {
      const commTotal = communicationResults.reduce((acc, r) => acc + r.overallScore, 0);
      const commScore = Math.round(commTotal / communicationResults.length);
      const overallScore = Math.round((aptitudeScore + technicalScore + commScore) / 3);

      const record: AssessmentRecord = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        topic,
        difficulty,
        aptitudeScore,
        technicalScore,
        communicationScore: commScore,
        overallScore,
        results: communicationResults
      };

      const res = await fetch(`${API_BASE_URL}/assessments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record)
      });

      return res.ok;
    } catch (error) {
      console.error("saveAssessment ERROR:", error);
      return false;
    }
  },

  getAllRecords: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/assessments`);
      return await res.json();
    } catch (err) {
      return [];
    }
  }
};
