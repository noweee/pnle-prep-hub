interface QuestionProgressResponse {
  answeredQuestionIds?: string[];
  error?: string;
}

async function parseProgressResponse(response: Response): Promise<string[]> {
  const data = (await response.json()) as QuestionProgressResponse;

  if (!response.ok) {
    throw new Error(data.error || 'Unable to sync question progress.');
  }

  return Array.isArray(data.answeredQuestionIds) ? data.answeredQuestionIds : [];
}

export async function fetchQuestionProgress(): Promise<string[]> {
  const response = await fetch('/api/progress', {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  return parseProgressResponse(response);
}

export async function markAnsweredQuestions(questionIds: string[]): Promise<string[]> {
  const response = await fetch('/api/progress', {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ questionIds }),
  });

  return parseProgressResponse(response);
}

export async function resetAnsweredQuestions(questionIds: string[]): Promise<string[]> {
  const response = await fetch('/api/progress', {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ questionIds }),
  });

  return parseProgressResponse(response);
}
