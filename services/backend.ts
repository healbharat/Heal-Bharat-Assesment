import { AssessmentRecord, StudentProfile, EvaluationResult } from "../types";

const DB_KEY = "interncomm_mongodb_simulation";
const BLOCKED_KEY = "interncomm_blocked_users";

const USE_REAL_BACKEND = true; // MUST BE TRUE

// Correct Render backend URL
const API_BASE_URL = "https://heal-bharat-backend.onrender.com/api";

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
        results: communicationResults,
      };

      if (USE_REAL_BACKEND) {
        const response = await fetch(`${API_BASE_URL}/assessments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record),
        });

        console.log("POST /assessments →", response.status);

        return response.ok;
      }

      // Local fallback
      const existing = JSON.parse(localStorage.getItem(DB_KEY) || "[]");
      existing.push(record);
      localStorage.setItem(DB_KEY, JSON.stringify(existing));
      return true;

    } catch (error) {
      console.error("Save Assessment Error:", error);
      return false;
    }
  },

  getAllRecords: async (): Promise<AssessmentRecord[]> => {
    if (USE_REAL_BACKEND) {
      try {
        const res = await fetch(`${API_BASE_URL}/assessments`);
        return await res.json();
      } catch (e) {
        console.error("Get Records API Error:", e);
        return [];
      }
    }

    return JSON.parse(localStorage.getItem(DB_KEY) || "[]");
  },

  verifyAccessCode: (code: string): boolean =>
    code === "assess-healbharat",

  blockUser: async (profile: StudentProfile, reason: string) => {
    if (USE_REAL_BACKEND) {
      try {
        await fetch(`${API_BASE_URL}/block`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...profile, reason }),
        });
      } catch (e) {
        console.error("Block API Error:", e);
      }
      return;
    }

    const list = JSON.parse(localStorage.getItem(BLOCKED_KEY) || "[]");
    list.push({
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      timestamp: Date.now(),
      reason,
    });
    localStorage.setItem(BLOCKED_KEY, JSON.stringify(list));
  },

  unblockUser: async (email: string) => {
    if (USE_REAL_BACKEND) {
      await fetch(`${API_BASE_URL}/block/${email}`, {
        method: "DELETE",
      });
      return;
    }

    let list = JSON.parse(localStorage.getItem(BLOCKED_KEY) || "[]");
    list = list.filter((u: BlockedUser) => u.email !== email);
    localStorage.setItem(BLOCKED_KEY, JSON.stringify(list));
  },

  isUserBlocked: async (email: string): Promise<boolean> => {
    if (USE_REAL_BACKEND) {
      const res = await fetch(`${API_BASE_URL}/check-block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      return data.isBlocked;
    }

    const list = JSON.parse(localStorage.getItem(BLOCKED_KEY) || "[]");
    return !!list.find((u: BlockedUser) => u.email === email);
  },

  getBlockedUsers: async (): Promise<BlockedUser[]> => {
    if (USE_REAL_BACKEND) {
      const res = await fetch(`${API_BASE_URL}/blocked`);
      return await res.json();
    }

    return JSON.parse(localStorage.getItem(BLOCKED_KEY) || "[]");
  },
};
