import { readJsonBlob, sendJson, writeJsonBlob } from './_shared.js';

function sortQuestions(questions) {
  return [...questions].sort((a, b) => {
    const categoryCompare = String(a.category || '').localeCompare(String(b.category || ''));
    if (categoryCompare !== 0) return categoryCompare;

    const situationCompare = String(a.situationText || '').localeCompare(String(b.situationText || ''));
    if (situationCompare !== 0) return situationCompare;

    return String(a.questionText || '').localeCompare(String(b.questionText || ''));
  });
}

export default async function handler(request, response) {
  try {
    if (request.method === 'GET') {
      const questions = await readJsonBlob('questions', []);
      return sendJson(response, { questions: sortQuestions(Array.isArray(questions) ? questions : []) });
    }

    if (request.method !== 'PUT') {
      response.setHeader('Allow', 'GET, PUT');
      return sendJson(response, { error: 'Method not allowed.' }, 405);
    }

    const questions = request.body?.questions;

    if (!Array.isArray(questions)) {
      return sendJson(response, { error: 'Request body must include a questions array.' }, 400);
    }

    const sortedQuestions = sortQuestions(questions);
    await writeJsonBlob('questions', sortedQuestions);
    return sendJson(response, { questions: sortedQuestions });
  } catch (error) {
    console.error('Unable to sync shared question bank:', error);
    return sendJson(response, { error: 'Unable to sync shared question bank.' }, 500);
  }
}
