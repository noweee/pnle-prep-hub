import { Question } from '../types';

interface QuestionBankResponse {
  questions?: Question[];
  error?: string;
}

async function parseQuestionBankResponse(response: Response): Promise<Question[]> {
  const data = (await response.json()) as QuestionBankResponse;

  if (!response.ok) {
    throw new Error(data.error || 'Unable to sync the shared question bank.');
  }

  return Array.isArray(data.questions) ? data.questions : [];
}

export async function fetchSharedQuestions(): Promise<Question[]> {
  const response = await fetch('/api/questions', {
    headers: {
      Accept: 'application/json',
    },
  });

  return parseQuestionBankResponse(response);
}

export async function saveSharedQuestions(questions: Question[]): Promise<Question[]> {
  const response = await fetch('/api/questions', {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ questions }),
  });

  return parseQuestionBankResponse(response);
}
