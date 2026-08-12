import { Question } from '../types';

interface QuestionBankResponse {
  questions?: Question[];
  importedCount?: number;
  skippedCount?: number;
  error?: string;
}

export interface QuestionImportResult {
  questions: Question[];
  importedCount: number;
  skippedCount: number;
}

async function readQuestionBankResponse(response: Response): Promise<QuestionBankResponse> {
  const data = (await response.json()) as QuestionBankResponse;

  if (!response.ok) {
    throw new Error(data.error || 'Unable to sync the shared question bank.');
  }

  return data;
}

async function parseQuestionBankResponse(response: Response): Promise<Question[]> {
  const data = await readQuestionBankResponse(response);
  return Array.isArray(data.questions) ? data.questions : [];
}

export async function fetchSharedQuestions(): Promise<Question[]> {
  const response = await fetch(`/api/questions?ts=${Date.now()}`, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  });

  return parseQuestionBankResponse(response);
}

export async function saveSharedQuestions(questions: Question[]): Promise<Question[]> {
  const response = await fetch('/api/questions', {
    method: 'PUT',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ questions }),
  });

  return parseQuestionBankResponse(response);
}

export async function importSharedQuestions(questions: Question[]): Promise<QuestionImportResult> {
  const response = await fetch('/api/questions', {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ questions }),
  });

  const data = await readQuestionBankResponse(response);

  return {
    questions: Array.isArray(data.questions) ? data.questions : [],
    importedCount: Number(data.importedCount || 0),
    skippedCount: Number(data.skippedCount || 0),
  };
}
