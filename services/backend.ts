import { AssessmentRecord, StudentProfile, EvaluationResult } from "../types";

// -------------------------------
// Local Storage Keys (fallback)
// -------------------------------
const DB_KEY = "interncomm_mongodb_simulation";
const BLOCKED_KEY = "interncomm_blocked_users";

// -------------------------------
// USE REAL BACKEND
// -------------------------------
const USE_REAL_BACKEND = true;

// -------------------------------
// Correct Render Backend URL
// -------------------------------
export const API_BASE_URL =
  "https://heal-bharat-assesment.onrender.com/api";

// -------------------------------
export interface BlockedUser {
  name: string;
  email: string;
  phone: string;
  timestamp: number;
  reason: string;
}

// -------------------------------
// BACKEND SERVICE
// -------------------------------
export const BackendService = {
  /* ----------------------------------------------
   * SAVE ASSESSMENT (with debug logging)
   * ---------------------------------------------- */
  saveAssessment: async (
    profile: StudentProfile,
    topic: string,
    difficulty: string,
    aptitudeScore: number,
    technicalScore: number,
    communicationResults: EvaluationResult[] = []
  ): Promise<boolean> => {
    try {
      // calculate communication score
      const total = communicationResults.reduce(
        (acc, r) => acc + (r.overallScore || 0),
        0
      );
      const communicationScore = communicationResults.length
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
        results: communicationResults,
      };

      // ------------------------
      // REAL BACKEND SAVE
      // ------------------------
      if (USE_REAL_BACKEND) {
        console.log("🔵 saveAssessment -> sending", record);

        const res = await fetch(`${API_BASE_URL}/assessments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record),
        });

        console.log("🟣 saveAssessment -> status", res.status);

        const text = await res.text();
        try {
          console.log("🟢 saveAssessment -> response JSON", JSON.parse(text));
        } catch {
          console.log("🟡 saveAssessment -> response TEXT", text);
        }

        return res.ok;
      }

      // ------------------------
      // LOCAL FALLBACK
      // ------------------------
      const existing = localStorage.getItem(DB_KEY);
      const arr = existing ? JSON.parse(existing) : [];
      arr.push(record);
      localStorage.setItem(DB_KEY, JSON.stringify(arr));

      return true;
    } catch (err) {
      console.error("❌ Save Assessment Error:", err);
      return false;
    }
  },

  /* ----------------------------------------------
   * GET ALL RECORDS
   * ---------------------------------------------- */
  getAllRecords: async (): Promise<AssessmentRecord[]> => {
    if (USE_REAL_BACKEND) {
      try {
        const res = await fetch(`${API_BASE_URL}/assessments`);
        return await res.json();
      } catch (err) {
        console.error("❌ getAllRecords Error:", err);
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
        console.error("❌ Block Error:", err);
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
        console.error("❌ Unblock Error:", err);
      }
      return;
    }

    let list: BlockedUser[] = JSON.parse(
      localStorage.getItem(BLOCKED_KEY) || "[]"
    );

    list = list.filter((u) => u.email !== email);
    localStorage.setItem(BLOCKED_KEY, JSON.stringify(list));
  },

  /* ----------------------------------------------
   * CHECK BLOCK STATUS
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
        console.error("❌ Check Block Error:", err);
        return false;
      }
    }

    const list = JSON.parse(localStorage.getItem(BLOCKED_KEY) || "[]");
    return !!list.find((u: BlockedUser) => u.email === email);
  },

  /* ----------------------------------------------
   * GET BLOCKED USERS
   * ---------------------------------------------- */
  getBlockedUsers: async (): Promise<BlockedUser[]> => {
    if (USE_REAL_BACKEND) {
      try {
        const res = await fetch(`${API_BASE_URL}/blocked`);
        return await res.json();
      } catch (err) {
        console.error("❌ Fetch Blocked Error:", err);
        return [];
      }
    }

    return JSON.parse(localStorage.getItem(BLOCKED_KEY) || "[]");
  },
};
