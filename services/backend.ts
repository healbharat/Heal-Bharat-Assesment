import { AssessmentRecord, StudentProfile, EvaluationResult } from "../types";

const DB_KEY = "interncomm_mongodb_simulation";
const BLOCKED_KEY = "interncomm_blocked_users";

// MUST BE TRUE IN PRODUCTION
const USE_REAL_BACKEND = true;

const API_BASE_URL = "https://heal-bharat-backend.onrender.com/api";


export interface BlockedUser {
  name: string;
  email: string;
  phone: string;
  timestamp: number;
  reason: string;
}

export const BackendService = {

  // SAVE ASSESSMENT ------------------------------------
  saveAssessment: async (
    profile: StudentProfile,
    topic: string,
    difficulty: string,
    aptitudeScore: number,
    technicalScore: number,
    communicationResults: EvaluationResult[] = []
  ): Promise<boolean> => {
    try {
      const total = communicationResults.reduce((acc, r) => acc + (r.overallScore || 0), 0);
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
        results: communicationResults
      };

      if (USE_REAL_BACKEND) {
        const res = await fetch(`${API_BASE_URL}/assessments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record)
        });

        console.log("SAVE STATUS:", res.status);

        const text = await res.text();
        try {
          console.log("SAVE RESPONSE:", JSON.parse(text));
        } catch {
          console.log("SAVE RAW:", text);
        }

        return res.ok;
      }

      // FALLBACK STORAGE
      const list = JSON.parse(localStorage.getItem(DB_KEY) || "[]");
      list.push(record);
      localStorage.setItem(DB_KEY, JSON.stringify(list));
      return true;

    } catch (err) {
      console.error("Save Assessment Error:", err);
      return false;
    }
  },

  // GET ALL RECORDS ------------------------------------
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

  // ACCESS CODE ----------------------------------------
  verifyAccessCode: (code: string) => code === "assess-healbharat",

  // BLOCK USER -----------------------------------------
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

  // UNBLOCK USER --------------------------------------
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

  // CHECK BLOCK ---------------------------------------
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

  // GET BLOCKED USERS ---------------------------------
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
