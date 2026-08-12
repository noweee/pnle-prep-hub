import { ExamHistoryItem, RankingStats } from '../types';

interface ScoresResponse {
  scores?: ExamHistoryItem[];
  ranking?: RankingStats;
  error?: string;
}

export interface ScoreSyncResult {
  scores: ExamHistoryItem[];
  ranking: RankingStats;
}

const emptyRanking: RankingStats = {
  rank: null,
  totalRankedUsers: 0,
  averageScore: 0,
  examsTaken: 0,
  rankingScore: 0,
  questionsAnswered: 0,
  correctAnswers: 0,
  accuracy: 0,
  passRate: 0,
};

async function parseScoresResponse(response: Response): Promise<ScoreSyncResult> {
  const data = (await response.json()) as ScoresResponse;

  if (!response.ok) {
    throw new Error(data.error || 'Unable to sync scores.');
  }

  return {
    scores: Array.isArray(data.scores) ? data.scores : [],
    ranking: data.ranking || emptyRanking,
  };
}

export async function fetchScores(): Promise<ScoreSyncResult> {
  const response = await fetch(`/api/scores?ts=${Date.now()}`, {
    credentials: 'include',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  });

  return parseScoresResponse(response);
}

export async function saveScore(score: Omit<ExamHistoryItem, 'id' | 'date'>): Promise<ScoreSyncResult> {
  const response = await fetch('/api/scores', {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(score),
  });

  return parseScoresResponse(response);
}

export async function clearScores(): Promise<ScoreSyncResult> {
  const response = await fetch('/api/scores', {
    method: 'DELETE',
    credentials: 'include',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  });

  return parseScoresResponse(response);
}
