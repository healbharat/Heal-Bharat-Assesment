
export interface Question {
  id: string;
  text: string;
  context?: string; // Additional context if needed
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface McqQuestion {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  category?: string;
}

export interface FeedbackMetric {
  score: number; // 0-100
  reasoning: string;
}

export interface EvaluationResult {
  questionId: string;
  transcription: string;
  overallScore: number;
  clarity: FeedbackMetric;
  confidence: FeedbackMetric;
  contentQuality: FeedbackMetric;
  grammarAndFluency: FeedbackMetric;
  keyTakeaways: string[];
  improvementTips: string[];
}

export interface SessionState {
  topic: string;
  difficulty: string;
  questions: Question[];
  results: EvaluationResult[];
  currentQuestionIndex: number;
  isComplete: boolean;
}

export interface StudentProfile {
  name: string;
  email: string;
  phone: string;
}

export interface AssessmentRecord extends StudentProfile {
  id: string;
  timestamp: number;
  
  // Scores
  aptitudeScore: number;
  technicalScore: number;
  communicationScore: number;
  overallScore: number;

  // Metadata
  topic: string;
  difficulty: string;
  results: EvaluationResult[]; // Communication detailed results
}

export enum AppView {
  ACCESS_CODE = 'ACCESS_CODE',
  SYSTEM_CHECK = 'SYSTEM_CHECK',
  STUDENT_FORM = 'STUDENT_FORM',
  
  APTITUDE_INSTRUCTIONS = 'APTITUDE_INSTRUCTIONS',
  APTITUDE_TEST = 'APTITUDE_TEST',
  
  TECHNICAL_INSTRUCTIONS = 'TECHNICAL_INSTRUCTIONS',
  TECHNICAL_TEST = 'TECHNICAL_TEST',
  
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
  LANDING = 'LANDING', // Comm instructions
  SETUP = 'SETUP',
  ASSESSMENT = 'ASSESSMENT',
  RESULTS = 'RESULTS'
}
