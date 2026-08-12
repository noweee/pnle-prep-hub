import { readJsonBlob, sendJson, writeJsonBlob } from './_shared.js';

function normalizeQuestionPart(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getQuestionFingerprint(question) {
  return [
    normalizeQuestionPart(question.questionText),
    normalizeQuestionPart(question.optionA),
    normalizeQuestionPart(question.optionB),
    normalizeQuestionPart(question.optionC),
    normalizeQuestionPart(question.optionD),
  ].join('|');
}

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

    if (request.method === 'DELETE') {
      await writeJsonBlob('questions', []);
      return sendJson(response, { questions: [] });
    }

    if (request.method !== 'PUT' && request.method !== 'POST') {
      response.setHeader('Allow', 'GET, PUT, POST, DELETE');
      return sendJson(response, { error: 'Method not allowed.' }, 405);
    }

    const questions = request.body?.questions;

    if (!Array.isArray(questions)) {
      return sendJson(response, { error: 'Request body must include a questions array.' }, 400);
    }

    if (request.method === 'POST') {
      const existingQuestions = await readJsonBlob('questions', []);
      const existingList = Array.isArray(existingQuestions) ? existingQuestions : [];
      const fingerprints = new Set(existingList.map(getQuestionFingerprint));
      const uniqueIncoming = [];

      questions.forEach((question) => {
        const fingerprint = getQuestionFingerprint(question);
        if (!fingerprint || fingerprints.has(fingerprint)) return;

        fingerprints.add(fingerprint);
        uniqueIncoming.push(question);
      });

      const sortedQuestions = sortQuestions([...existingList, ...uniqueIncoming]);
      await writeJsonBlob('questions', sortedQuestions);
      return sendJson(response, {
        questions: sortedQuestions,
        importedCount: uniqueIncoming.length,
        skippedCount: questions.length - uniqueIncoming.length,
      });
    }

    const sortedQuestions = sortQuestions(questions);
    await writeJsonBlob('questions', sortedQuestions);
    return sendJson(response, { questions: sortedQuestions });
  } catch (error) {
    console.error('Unable to sync shared question bank:', error);
    const message = error?.message ? `Unable to sync shared question bank: ${error.message}` : 'Unable to sync shared question bank.';
    return sendJson(response, { error: message }, 500);
  }
}
