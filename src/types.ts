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

export interface RevisionRequest {
  id: string;
  questionId: string;
  questionText: string;
  issueDescription: string;
  suggestedFix: string;
  date: string; // ISO String
}

