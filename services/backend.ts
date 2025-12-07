
import { AssessmentRecord, StudentProfile, EvaluationResult } from '../types';

// STORAGE KEYS
const DB_KEY = 'interncomm_mongodb_simulation';
const BLOCKED_KEY = 'interncomm_blocked_users';

// --- CONFIGURATION ---
// Set this to TRUE to connect to the node.js server (server.js)
// Set this to FALSE to use the browser's LocalStorage (Simulation)
// CHANGED: Default to false to ensure stability on Render/Vercel without backend
const USE_REAL_BACKEND = false; 

const API_BASE_URL = 'https://heal-bharat-assesment.onrender.com';

export interface BlockedUser {
  name: string;
  email: string;
  phone: string;
  timestamp: number;
  reason: string;
}

/**
 * TRONEX BACKEND SERVICE
 * Handles data persistence via API or LocalStorage simulation.
 */

export const BackendService = {
  
  /**
   * Save a completed assessment to the database.
   */
  saveAssessment: async (
    profile: StudentProfile, 
    topic: string, 
    difficulty: string, 
    aptitudeScore: number,
    technicalScore: number,
    communicationResults: EvaluationResult[]
  ): Promise<boolean> => {
    try {
      // Calculate Communication Score (Average of 3 questions)
      const commTotal = communicationResults.reduce((acc, r) => acc + r.overallScore, 0);
      const commScore = communicationResults.length > 0 ? Math.round(commTotal / communicationResults.length) : 0;

      // Overall Average of the 3 sections
      // Weights could be adjusted here if needed. Currently equal weight.
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

      if (USE_REAL_BACKEND) {
          const response = await fetch(`${API_BASE_URL}/assessments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(record)
          });
          return response.ok;
      } else {
          // Simulation
          await new Promise(resolve => setTimeout(resolve, 800));
          const existingDataStr = localStorage.getItem(DB_KEY);
          const existingData: AssessmentRecord[] = existingDataStr ? JSON.parse(existingDataStr) : [];
          existingData.push(record);
          localStorage.setItem(DB_KEY, JSON.stringify(existingData));
          return true;
      }
    } catch (error) {
      console.error("Database Error:", error);
      return false;
    }
  },

  getAllRecords: async (): Promise<AssessmentRecord[]> => {
    if (USE_REAL_BACKEND) {
        try {
            const response = await fetch(`${API_BASE_URL}/assessments`);
            if (!response.ok) throw new Error('Failed to fetch');
            return await response.json();
        } catch (e) {
            console.error(e);
            return [];
        }
    } else {
        await new Promise(resolve => setTimeout(resolve, 500));
        const existingDataStr = localStorage.getItem(DB_KEY);
        const data: AssessmentRecord[] = existingDataStr ? JSON.parse(existingDataStr) : [];
        return data.sort((a, b) => b.timestamp - a.timestamp);
    }
  },

  verifyAccessCode: (code: string): boolean => {
    return code === 'assess-healbharat';
  },

  // --- BLOCKING LOGIC ---

  blockUser: async (profile: StudentProfile, reason: string): Promise<void> => {
    if (USE_REAL_BACKEND) {
        try {
            await fetch(`${API_BASE_URL}/block`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...profile, reason })
            });
        } catch (e) { console.error("API Block Error", e); }
    } else {
        const blockedStr = localStorage.getItem(BLOCKED_KEY);
        const blocked: BlockedUser[] = blockedStr ? JSON.parse(blockedStr) : [];
        
        if (!blocked.find(u => u.email === profile.email)) {
            blocked.push({
                name: profile.name,
                email: profile.email,
                phone: profile.phone,
                timestamp: Date.now(),
                reason
            });
            localStorage.setItem(BLOCKED_KEY, JSON.stringify(blocked));
        }
    }
  },

  unblockUser: async (email: string): Promise<void> => {
    if (USE_REAL_BACKEND) {
        try {
            await fetch(`${API_BASE_URL}/block/${email}`, { method: 'DELETE' });
        } catch (e) { console.error("API Unblock Error", e); }
    } else {
        const blockedStr = localStorage.getItem(BLOCKED_KEY);
        let blocked: BlockedUser[] = blockedStr ? JSON.parse(blockedStr) : [];
        blocked = blocked.filter(u => u.email !== email);
        localStorage.setItem(BLOCKED_KEY, JSON.stringify(blocked));
    }
  },

  isUserBlocked: async (email: string): Promise<boolean> => {
    if (USE_REAL_BACKEND) {
        try {
            const response = await fetch(`${API_BASE_URL}/check-block`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            return data.isBlocked;
        } catch (e) {
            console.error("API Check Block Error", e);
            // Fallback to false if API is down to allow user to proceed
            return false;
        }
    } else {
        await new Promise(resolve => setTimeout(resolve, 300));
        const blockedStr = localStorage.getItem(BLOCKED_KEY);
        const blocked: BlockedUser[] = blockedStr ? JSON.parse(blockedStr) : [];
        return !!blocked.find(u => u.email === email);
    }
  },

  getBlockedUsers: async (): Promise<BlockedUser[]> => {
    if (USE_REAL_BACKEND) {
        try {
            const response = await fetch(`${API_BASE_URL}/blocked`);
            return await response.json();
        } catch (e) {
            console.error("API Fetch Blocked Error", e);
            return [];
        }
    } else {
        const blockedStr = localStorage.getItem(BLOCKED_KEY);
        return blockedStr ? JSON.parse(blockedStr) : [];
    }
  }
};
