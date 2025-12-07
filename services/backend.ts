import { AssessmentRecord, StudentProfile, EvaluationResult } from '../types';

// STORAGE KEYS (LocalStorage simulation)
const DB_KEY = 'interncomm_mongodb_simulation';
const BLOCKED_KEY = 'interncomm_blocked_users';

// ENABLE REAL BACKEND IN PRODUCTION
const USE_REAL_BACKEND = true;

// Render Backend URL
const API_BASE_URL = 'https://heal-bharat-backend.onrender.com/api';

export interface BlockedUser {
  name: string;
  email: string;
  phone: string;
  timestamp: number;
  reason: string;
}

export const BackendService = {

  /** ============================================================
   * SAVE ASSESSMENT
   * ============================================================ */
  saveAssessment: async (
    profile: StudentProfile,
    topic: string,
    difficulty: string,
    aptitudeScore: number,
    technicalScore: number,
    communicationScore: number,
    communicationResults: EvaluationResult[] = []
  ): Promise<boolean> => {
    try {
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
        const response = await fetch(`${API_BASE_URL}/assessments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        });

        return response.ok;
      }

      // Local simulation
      const existing = localStorage.getItem(DB_KEY);
      const data = existing ? JSON.parse(existing) : [];
      data.push(record);
      localStorage.setItem(DB_KEY, JSON.stringify(data));
      return true;

    } catch (error) {
      console.error("Save Error:", error);
      return false;
    }
  },

  /** ============================================================
   * GET ALL RECORDS
   * ============================================================ */
  getAllRecords: async (): Promise<AssessmentRecord[]> => {
    if (USE_REAL_BACKEND) {
      try {
        const res = await fetch(`${API_BASE_URL}/assessments`);
        return await res.json();
      } catch (e) {
        console.error("Fetch Error:", e);
        return [];
      }
    }

    const existing = localStorage.getItem(DB_KEY);
    const data = existing ? JSON.parse(existing) : [];
    return data.sort((a: any, b: any) => b.timestamp - a.timestamp);
  },

  /** ============================================================
   * ACCESS CODE
   * ============================================================ */
  verifyAccessCode: (code: string): boolean => {
    return code === "assess-healbharat";
  },

  /** ============================================================
   * BLOCK USER
   * ============================================================ */
  blockUser: async (profile: StudentProfile, reason: string): Promise<void> => {
    if (USE_REAL_BACKEND) {
      try {
        await fetch(`${API_BASE_URL}/block`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...profile, reason })
        });
      } catch (e) {
        console.error("Block API Error:", e);
      }
      return;
    }

    // Local simulation
    const existing = localStorage.getItem(BLOCKED_KEY);
    const list: BlockedUser[] = existing ? JSON.parse(existing) : [];

    if (!list.find((u) => u.email === profile.email)) {
      list.push({
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        timestamp: Date.now(),
        reason
      });
      localStorage.setItem(BLOCKED_KEY, JSON.stringify(list));
    }
  },

  /** ============================================================
   * UNBLOCK USER
   * ============================================================ */
  unblockUser: async (email: string): Promise<void> => {
    if (USE_REAL_BACKEND) {
      try {
        await fetch(`${API_BASE_URL}/block/${email}`, {
          method: "DELETE"
        });
      } catch (e) {
        console.error("Unblock Error:", e);
      }
      return;
    }

    const existing = localStorage.getItem(BLOCKED_KEY);
    let list: BlockedUser[] = existing ? JSON.parse(existing) : [];

    list = list.filter((u) => u.email !== email);
    localStorage.setItem(BLOCKED_KEY, JSON.stringify(list));
  },

  /** ============================================================
   * CHECK IF USER IS BLOCKED
   * ============================================================ */
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
      } catch (e) {
        console.error("Check Block Error:", e);
        return false;
      }
    }

    const existing = localStorage.getItem(BLOCKED_KEY);
    const list: BlockedUser[] = existing ? JSON.parse(existing) : [];

    return !!list.find((u) => u.email === email);
  },

  /** ============================================================
   * GET BLOCKED USERS LIST
   * ============================================================ */
  getBlockedUsers: async (): Promise<BlockedUser[]> => {
    if (USE_REAL_BACKEND) {
      try {
        const res = await fetch(`${API_BASE_URL}/blocked`);
        return await res.json();
      } catch (e) {
        console.error("Fetch Blocked Error:", e);
        return [];
      }
    }

    const existing = localStorage.getItem(BLOCKED_KEY);
    return existing ? JSON.parse(existing) : [];
  }
};
