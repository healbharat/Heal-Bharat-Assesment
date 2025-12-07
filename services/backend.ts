import { AssessmentRecord, StudentProfile, EvaluationResult } from '../types';

// STORAGE KEYS
const DB_KEY = 'tronex_assessments_db';
const BLOCKED_KEY = 'tronex_blocked_users';

// ❗ IMPORTANT: Render वर backend चालत नाही → त्यामुळे ALWAYS false
const USE_REAL_BACKEND = false;

// जर भविष्यात Render backend deploy केला तर ही URL टाकायची
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "https://heal-bharat-assesment.onrender.com/";

// BLOCKED USER TYPE
export interface BlockedUser {
  name: string;
  email: string;
  phone: string;
  timestamp: number;
  reason: string;
}

export const BackendService = {

  // SAVE ASSESSMENT ---------------------------------------------------------
  saveAssessment: async (
    profile: StudentProfile,
    topic: string,
    difficulty: string,
    aptitudeScore: number,
    technicalScore: number,
    communicationResults: EvaluationResult[]
  ): Promise<boolean> => {
    try {
      const commAvg =
        communicationResults.length > 0
          ? Math.round(
              communicationResults.reduce((t, r) => t + r.overallScore, 0) /
                communicationResults.length
            )
          : 0;

      const overall = Math.round(
        (aptitudeScore + technicalScore + commAvg) / 3
      );

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
        communicationScore: commAvg,
        overallScore: overall,
        results: communicationResults,
      };

      // 🔥 LOCAL STORAGE MODE (Render-friendly)
      if (!USE_REAL_BACKEND) {
        const existing = JSON.parse(localStorage.getItem(DB_KEY) || "[]");
        existing.push(record);
        localStorage.setItem(DB_KEY, JSON.stringify(existing));
        return true;
      }

      // REAL BACKEND MODE (future use)
      const response = await fetch(`${API_BASE_URL}/assessments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });

      return response.ok;
    } catch (err) {
      console.error("Save Error:", err);
      return false;
    }
  },

  // GET ALL RECORDS ---------------------------------------------------------
  getAllRecords: async (): Promise<AssessmentRecord[]> => {
    if (!USE_REAL_BACKEND) {
      const all = JSON.parse(localStorage.getItem(DB_KEY) || "[]");
      return all.sort((a: any, b: any) => b.timestamp - a.timestamp);
    }

    const res = await fetch(`${API_BASE_URL}/assessments`);
    return await res.json();
  },

  // ACCESS CODE VERIFICATION ------------------------------------------------
  verifyAccessCode: (code: string): boolean => {
    return code.trim().toLowerCase() === "assess-healbharat";
  },

  // BLOCK USER --------------------------------------------------------------
  blockUser: async (profile: StudentProfile, reason: string) => {
    const blocked = JSON.parse(localStorage.getItem(BLOCKED_KEY) || "[]");

    if (!blocked.find((u: BlockedUser) => u.email === profile.email)) {
      blocked.push({
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        timestamp: Date.now(),
        reason,
      });

      localStorage.setItem(BLOCKED_KEY, JSON.stringify(blocked));
    }
  },

  // UNBLOCK USER ------------------------------------------------------------
  unblockUser: async (email: string) => {
    let blocked = JSON.parse(localStorage.getItem(BLOCKED_KEY) || "[]");
    blocked = blocked.filter((u: BlockedUser) => u.email !== email);
    localStorage.setItem(BLOCKED_KEY, JSON.stringify(blocked));
  },

  // IS USER BLOCKED ---------------------------------------------------------
  isUserBlocked: async (email: string): Promise<boolean> => {
    const blocked = JSON.parse(localStorage.getItem(BLOCKED_KEY) || "[]");
    return !!blocked.find((u: BlockedUser) => u.email === email);
  },

  // GET BLOCKED USERS -------------------------------------------------------
  getBlockedUsers: async (): Promise<BlockedUser[]> => {
    return JSON.parse(localStorage.getItem(BLOCKED_KEY) || "[]");
  },
};
