import { AssessmentRecord, StudentProfile, EvaluationResult } from '../types';

// ⭐ REAL BACKEND ENABLED
const USE_REAL_BACKEND = true;

// ⭐ Render backend URL from environment
const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

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

      const response = await fetch(`${API_BASE_URL}/assessments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record)
      });

      return response.ok;

    } catch (err) {
      console.error("Save assessment error:", err);
      return false;
    }
  },

  getAllRecords: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/assessments`);
      return await res.json();
    } catch (err) {
      console.error("Fetch records error:", err);
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
    } catch (err) {
      console.error("Block user error:", err);
    }
  },

  unblockUser: async (email: string) => {
    try {
      await fetch(`${API_BASE_URL}/block/${email}`, { method: "DELETE" });
    } catch (err) {
      console.error("Unblock user error:", err);
    }
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

    } catch (err) {
      console.error("Check block error:", err);
      return false;
    }
  },

  getBlockedUsers: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/blocked`);
      return await res.json();
    } catch (err) {
      console.error("Get blocked error:", err);
      return [];
    }
  }

};
