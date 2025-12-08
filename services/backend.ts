import { AssessmentRecord, StudentProfile, EvaluationResult } from "../types";

// Local fallback keys
const DB_KEY = "interncomm_mongodb_simulation";
const BLOCKED_KEY = "interncomm_blocked_users";

// ENABLE REAL BACKEND
const USE_REAL_BACKEND = true;

// 💥 VERY IMPORTANT: Correct Render backend URL
const API_BASE_URL = "https://heal-bharat-assesment.onrender.com";

export interface BlockedUser {
  name: string;
  email: string;
  phone: string;
  timestamp: number;
  reason: string;
}

export const BackendService = {

  /* ----------------------------------------------
   *  SAVE ASSESSMENT
   * ---------------------------------------------- */
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

      // Final overall score
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

      // ---- SAVE TO REAL BACKEND ----
      if (USE_REAL_BACKEND) {
        const res = await fetch(`${API_BASE_URL}/assessments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record),
        });

        return res.ok;
      }

      // ---- LOCAL SIMULATION ----
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

  /* ----------------------------------------------
   * GET ALL ASSESSMENTS
   * ---------------------------------------------- */
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

  /* ----------------------------------------------
   * VERIFY ACCESS CODE
   * ---------------------------------------------- */
  verifyAccessCode: (code: string): boolean => {
    return code === "assess-healbharat";
  },

  /* ----------------------------------------------
   * BLOCK USER
   * ---------------------------------------------- */
  blockUser: async (profile: StudentProfile, reason: string): Promise<void> => {
    if (USE_REAL_BACKEND) {
      try {
        await fetch(`${API_BASE_URL}/block`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...profile, reason }),
        });
      } catch (err) {
        console.error("Block User Error:", err);
      }
      return;
    }

    const data = localStorage.getItem(BLOCKED_KEY);
    const list: BlockedUser[] = data ? JSON.parse(data) : [];

    if (!list.find((u) => u.email === profile.email)) {
      list.push({
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        timestamp: Date.now(),
        reason,
      });

      localStorage.setItem(BLOCKED_KEY, JSON.stringify(list));
    }
  },

  /* ----------------------------------------------
   * UNBLOCK USER
   * ---------------------------------------------- */
  unblockUser: async (email: string): Promise<void> => {
    if (USE_REAL_BACKEND) {
      try {
        await fetch(`${API_BASE_URL}/block/${email}`, {
          method: "DELETE",
        });
      } catch (err) {
        console.error("Unblock Error:", err);
      }
      return;
    }

    let list: BlockedUser[] = JSON.parse(localStorage.getItem(BLOCKED_KEY) || "[]");
    list = list.filter((u) => u.email !== email);
    localStorage.setItem(BLOCKED_KEY, JSON.stringify(list));
  },

  /* ----------------------------------------------
   * CHECK IF USER IS BLOCKED
   * ---------------------------------------------- */
  isUserBlocked: async (email: string): Promise<boolean> => {
    if (USE_REAL_BACKEND) {
      try {
        const res = await fetch(`${API_BASE_URL}/check-block`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const data = await res.json();
        return data.isBlocked;
      } catch (err) {
        console.error("Check Block Error:", err);
        return false;
      }
    }

    const blocked = JSON.parse(localStorage.getItem(BLOCKED_KEY) || "[]");
    return !!blocked.find((u: BlockedUser) => u.email === email);
  },

  /* ----------------------------------------------
   * GET ALL BLOCKED USERS
   * ---------------------------------------------- */
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

    return JSON.parse(localStorage.getItem(BLOCKED_KEY) || "[]");
  },
};
