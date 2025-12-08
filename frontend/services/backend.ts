import { AssessmentRecord, StudentProfile, EvaluationResult } from "../types";

const DB_KEY = "interncomm_mongodb_simulation";
const BLOCKED_KEY = "interncomm_blocked_users";

// MUST BE TRUE IN PRODUCTION
const USE_REAL_BACKEND = true;

// Render Env → VITE_API_BASE_URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface BlockedUser {
  name: string;
  email: string;
  phone: string;
  timestamp: number;
  reason: string;
}

export const BackendService = {

  // ---------------------------------------------
  // SAVE ASSESSMENT (FIXED VERSION)
  // ---------------------------------------------
  saveAssessment: async (
    profile: StudentProfile,
    topic: string,
    difficulty: string,
    aptitudeScore: number,
    technicalScore: number,
    communicationResults: EvaluationResult[] | any
  ): Promise<boolean> => {
    try {
      console.log("COMM RESULTS RAW =>", communicationResults);

      // Ensure results is ALWAYS an array
      const resultsArray: EvaluationResult[] = Array.isArray(communicationResults)
        ? communicationResults
        : [];

      // SAFE Score calculations
      const total = resultsArray.reduce(
        (acc, r) => acc + (r?.overallScore ?? 0),
        0
      );

      const communicationScore = resultsArray.length
        ? Math.round(total / resultsArray.length)
        : 0;

      const overallScore = Math.round(
        (aptitudeScore + technicalScore + communicationScore) / 3
      );

      // Final record to save
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
        results: resultsArray
      };

      console.log("FINAL RECORD SENDING =>", record);

      if (USE_REAL_BACKEND) {
        const res = await fetch(`${API_BASE_URL}/assessments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record)
        });

        console.log("SAVE STATUS:", res.status);

        if (!res.ok) {
          const err = await res.text();
          console.error("SAVE FAILED RESPONSE:", err);
        }

        return res.ok;
      }

      // LOCAL STORAGE fallback
      const list = JSON.parse(localStorage.getItem(DB_KEY) || "[]");
      list.push(record);
      localStorage.setItem(DB_KEY, JSON.stringify(list));
      return true;

    } catch (err) {
      console.error("Save Assessment Error:", err);
      return false;
    }
  },

  // ---------------------------------------------
  getAllRecords: async (): Promise<AssessmentRecord[]> => {
    if (USE_REAL_BACKEND) {
      try {
        const res = await fetch(`${API_BASE_URL}/assessments`);
        return await res.json();
      } catch (err) {
        console.error("GET RECORDS ERROR:", err);
        return [];
      }
    }
    return JSON.parse(localStorage.getItem(DB_KEY) || "[]");
  },

  // ---------------------------------------------
  verifyAccessCode: (code: string) => code === "assess-healbharat",

  // ---------------------------------------------
  blockUser: async (profile: StudentProfile, reason: string) => {
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

  // ---------------------------------------------
  unblockUser: async (email: string) => {
    if (USE_REAL_BACKEND) {
      try {
        await fetch(`${API_BASE_URL}/block/${email}`, { method: "DELETE" });
      } catch (err) {
        console.error("Unblock Error:", err);
      }
      return;
    }
  },

  // ---------------------------------------------
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
        console.error("Check block error:", err);
        return false;
      }
    }
    return false;
  },

  // ---------------------------------------------
  getBlockedUsers: async (): Promise<BlockedUser[]> => {
    if (USE_REAL_BACKEND) {
      try {
        const res = await fetch(`${API_BASE_URL}/blocked`);
        return await res.json();
      } catch (err) {
        console.error("Get Blocked Error:", err);
        return [];
      }
    }
    return [];
  },
};
