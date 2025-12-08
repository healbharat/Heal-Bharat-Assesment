import { AssessmentRecord, StudentProfile, EvaluationResult } from "../types";

// -------------------------------------------
// LOCAL FALLBACK (जर backend down झाला तर)
// -------------------------------------------
const DB_KEY = "interncomm_mongodb_simulation";
const BLOCKED_KEY = "interncomm_blocked_users";

// -------------------------------------------
// ENABLE REAL BACKEND
// -------------------------------------------
const USE_REAL_BACKEND = true;

// -------------------------------------------
// BACKEND BASE URL (IMPORTANT: /api नाही लावायचं इथे)
// -------------------------------------------
const API_BASE_URL = "https://heal-bharat-assesment.onrender.com";

// -------------------------------------------
// TYPES
// -------------------------------------------
export interface BlockedUser {
  name: string;
  email: string;
  phone: string;
  timestamp: number;
  reason: string;
}

// -------------------------------------------
// BACKEND SERVICE
// -------------------------------------------
export const BackendService = {

  // ============================================================
  //  SAVE ASSESSMENT
  // ============================================================
  saveAssessment: async (
    profile: StudentProfile,
    topic: string,
    difficulty: string,
    aptitudeScore: number,
    technicalScore: number,
    communicationResults: EvaluationResult[]
  ): Promise<boolean> => {
    try {
      // Calculate communication score
      const total = communicationResults.reduce((acc, r) => acc + r.overallScore, 0);
      const communicationScore =
        communicationResults.length > 0
          ? Math.round(total / communicationResults.length)
          : 0;

      const overallScore = Math.round(
        (aptitudeScore + technicalScore + communicationScore) / 3
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
        communicationScore,
        overallScore,
        results: communicationResults
      };

      if (USE_REAL_BACKEND) {
        const res = await fetch(`${API_BASE_URL}/assessments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record)
        });

        return res.ok;
      }

      // fallback (local storage)
      const existing = localStorage.getItem(DB_KEY);
      const list = existing ? JSON.parse(existing) : [];
      list.push(record);
      localStorage.setItem(DB_KEY, JSON.stringify(list));
      return true;

    } catch (err) {
      console.error("Save Assessment Error:", err);
      return false;
    }
  },

  // ============================================================
  //  GET ALL ASSESSMENTS
  // ============================================================
  getAllRecords: async (): Promise<AssessmentRecord[]> => {
    if (USE_REAL_BACKEND) {
      try {
        const res = await fetch(`${API_BASE_URL}/assessments`);
        return await res.json();
      } catch (err) {
        console.error("Fetch Records Error:", err);
        return [];
      }
    }

    const data = localStorage.getItem(DB_KEY);
    return data ? JSON.parse(data) : [];
  },

  // ============================================================
  //  VERIFY ACCESS CODE
  // ============================================================
  verifyAccessCode: (code: string): boolean => {
    return code === "assess-healbharat";
  },

  // ============================================================
  //  BLOCK USER
  // ============================================================
  blockUser: async (profile: StudentProfile, reason: string): Promise<void> => {
    if (USE_REAL_BACKEND) {
      try {
        await fetch(`${API_BASE_URL}/block`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...profile, reason })
        });
      } catch (err) {
        console.error("Block Error:", err);
      }
      return;
    }
  },

  // ============================================================
  //  UNBLOCK USER
  // ============================================================
  unblockUser: async (email: string): Promise<void> => {
    if (USE_REAL_BACKEND) {
      try {
        await fetch(`${API_BASE_URL}/block/${email}`, {
          method: "DELETE"
        });
      } catch (err) {
        console.error("Unblock Error:", err);
      }
      return;
    }
  },

  // ============================================================
  //  CHECK USER BLOCKED OR NOT
  // ============================================================
  isUserBlocked: async (email: string): Promise<boolean> => {
    if (USE_REAL_BACKEND) {
      try {
        const res = await fetch(`${API_BASE_URL}/check-block`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });

        const data = await res.json();
        return data.isBlocked;
      } catch (err) {
        console.error("Check Block Error:", err);
        return false;
      }
    }

    return false;
  },

  // ============================================================
  //  GET BLOCKED USERS LIST
  // ============================================================
  getBlockedUsers: async (): Promise<BlockedUser[]> => {
    if (USE_REAL_BACKEND) {
      try {
        const res = await fetch(`${API_BASE_URL}/blocked`);
        return await res.json();
      } catch (err) {
        console.error("Fetch Blocked Users Error:", err);
        return [];
      }
    }

    return [];
  }
};
