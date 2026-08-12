export interface Question {
  id: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  rationale?: string;
  category?: string; // e.g. "NP I: Foundation of Professional Nursing Practice"
  situationText?: string;
  situationId?: string;
  sourceExam?: string; // e.g. "December 2008 Past Boards"
  isPastBoard?: boolean;
}

export interface QuizConfig {
  category: string; // "all" or specific category
  questionCount: number;
  mode: 'qna' | 'exam'; // 'qna' is instant feedback, 'exam' is reveal at end
}

export interface QuizQuestionState {
  question: Question;
  selectedAnswer: 'A' | 'B' | 'C' | 'D' | null;
  isFlagged: boolean;
  isCorrect?: boolean;
}

export interface QuizSession {
  config: QuizConfig;
  questions: QuizQuestionState[];
  currentIndex: number;
  startTime: number;
  endTime: number | null;
  score: number | null;
}

export interface ExamHistoryItem {
  id: string;
  date: string; // ISO String
  categoryName: string;
  questionCount: number;
  correctCount: number;
  scorePercent: number;
  timeSpentSeconds: number;
  mode: 'qna' | 'exam';
}

export interface RankingPeriodStats {
  rank: number | null;
  totalRankedUsers: number;
  rankingScore: number;
  examsTaken: number;
  questionsAnswered: number;
  correctAnswers: number;
  averageScore: number;
  accuracy: number;
  passRate: number;
}

export interface SubjectRankingStats extends RankingPeriodStats {
  subject: string;
}

export interface RankingStats {
  rank: number | null;
  totalRankedUsers: number;
  averageScore: number;
  examsTaken: number;
  rankingScore?: number;
  questionsAnswered?: number;
  correctAnswers?: number;
  accuracy?: number;
  passRate?: number;
  daily?: RankingPeriodStats;
  weekly?: RankingPeriodStats;
  monthly?: RankingPeriodStats;
  allTime?: RankingPeriodStats;
  subjects?: SubjectRankingStats[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  isAdmin: boolean;
  isEnabled: boolean;
}

export interface RevisionRequest {
  id: string;
  questionId: string;
  questionText: string;
  issueDescription: string;
  suggestedFix: string;
  date: string; // ISO String
}

