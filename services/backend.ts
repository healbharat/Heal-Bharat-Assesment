import { AssessmentRecord, StudentProfile, EvaluationResult } from '../types';

// STORAGE KEYS (Only used if simulator mode)
const DB_KEY = 'interncomm_mongodb_simulation';
const BLOCKED_KEY = 'interncomm_blocked_users';

// ⭐ BACKEND ENABLED
const USE_REAL_BACKEND = true;

// ⭐ Render backend URL (from env)
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL + "/api";

export interface BlockedUser {
  name: string;
  email: string;
  phone: string;
  timestamp: number;
  reason: string;
}

export const BackendService = {

  saveAssessment: async (
    profile: StudentProfile,
    topic: string,
    difficulty: string,
    aptitudeScore: number,
    technicalScore: number,
    communicationResults: EvaluationResult[]
  ): Promise<boolean> => {
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

      const response = await fetch(`${API_BASE_URL}/assessments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record)
      });

      return response.ok;

    } catch (error) {
      console.error("Backend save error:", error);
      return false;
    }
  },

  getAllRecords: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/assessments`);
      return await response.json();
    } catch (err) {
      console.error("Fetch records error:", err);
      return [];
    }
  },

  verifyAccessCode: () => true,

  blockUser: async (profile: StudentProfile, reason: string) => {
    await fetch(`${API_BASE_URL}/block`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...profile, reason })
    });
  },

  unblockUser: async (email: string) => {
    await fetch(`${API_BASE_URL}/block/${email}`, { method: "DELETE" });
  },

  isUserBlocked: async (email: string): Promise<boolean> => {
    const res = await fetch(`${API_BASE_URL}/check-block`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const data = await res.json();
    return data.isBlocked;
  },

  getBlockedUsers: async () => {
    const response = await fetch(`${API_BASE_URL}/blocked`);
    return await response.json();
  }
};
