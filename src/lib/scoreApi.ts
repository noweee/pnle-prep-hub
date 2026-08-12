import { ExamHistoryItem } from '../types';

interface ScoresResponse {
  scores?: ExamHistoryItem[];
  error?: string;
}

async function parseScoresResponse(response: Response): Promise<ExamHistoryItem[]> {
  const data = (await response.json()) as ScoresResponse;

  if (!response.ok) {
    throw new Error(data.error || 'Unable to sync scores.');
  }

  return Array.isArray(data.scores) ? data.scores : [];
}

export async function fetchScores(): Promise<ExamHistoryItem[]> {
  const response = await fetch('/api/scores', {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  return parseScoresResponse(response);
}

export async function saveScore(score: Omit<ExamHistoryItem, 'id' | 'date'>): Promise<ExamHistoryItem[]> {
  const response = await fetch('/api/scores', {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(score),
  });

  return parseScoresResponse(response);
}

export async function clearScores(): Promise<ExamHistoryItem[]> {
  const response = await fetch('/api/scores', {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  return parseScoresResponse(response);
}
