import { AssessmentRecord, StudentProfile, EvaluationResult } from '../types';

// CONFIG
const USE_REAL_BACKEND = true;

// YOUR BACKEND URL
const API_BASE_URL = "https://heal-bharat-backend.onrender.com/api";

export interface BlockedUser {
  name: string;
  email: string;
  phone: string;
  timestamp: number;
  reason: string;
}

export const BackendService = {

  verifyAccessCode: (code: string): boolean => {
    return code === "assess-healbharat";
  },

  saveAssessment: async (profile, topic, difficulty, aptitudeScore, technicalScore, communicationResults) => {
    try {
      const commTotal = communicationResults.reduce((a, r) => a + r.overallScore, 0);
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
    } catch (err) {
      console.error("saveAssessment ERROR:", err);
      return false;
    }
  },

  getAllRecords: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/assessments`);
      return await res.json();
    } catch {
      return [];
    }
  },

  blockUser: async (profile: StudentProfile, reason: string) => {
    try {
      await fetch(`${API_BASE_URL}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile, reason })
      });
    } catch {}
  },

  unblockUser: async (email: string) => {
    try {
      await fetch(`${API_BASE_URL}/block/${email}`, {
        method: "DELETE",
      });
    } catch {}
  },

  isUserBlocked: async (email: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}/check-block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      return data.isBlocked;
    } catch {
      return false;
    }
  },

  getBlockedUsers: async (): Promise<BlockedUser[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/blocked`);
      return await res.json();
    } catch {
      return [];
    }
  }
};
