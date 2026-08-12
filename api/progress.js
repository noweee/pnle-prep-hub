import {
  getSignedInUser,
  readJsonBlob,
  sendJson,
  writeJsonBlob,
} from './_shared.js';

function readBody(request) {
  return typeof request.body === 'object' && request.body !== null ? request.body : {};
}

function cleanQuestionIds(questionIds) {
  return Array.isArray(questionIds)
    ? questionIds.map((id) => String(id || '').trim()).filter(Boolean)
    : [];
}

function getUserProgress(progressStore, userId) {
  const progress = progressStore[userId] || {};
  return {
    answeredQuestionIds: Array.isArray(progress.answeredQuestionIds) ? progress.answeredQuestionIds : [],
    updatedAt: progress.updatedAt || null,
  };
}

export default async function handler(request, response) {
  try {
    const user = await getSignedInUser(request);

    if (!user) {
      return sendJson(response, { error: 'Please sign in to track question progress.' }, 401);
    }

    if (!user.isEnabled && !user.isAdmin) {
      return sendJson(response, { error: 'Your account is pending admin approval.' }, 403);
    }

    const progressStore = await readJsonBlob('question-progress', {});
    const currentProgress = getUserProgress(progressStore, user.id);

    if (request.method === 'GET') {
      return sendJson(response, currentProgress);
    }

    if (request.method !== 'POST' && request.method !== 'DELETE') {
      response.setHeader('Allow', 'GET, POST, DELETE');
      return sendJson(response, { error: 'Method not allowed.' }, 405);
    }

    const body = readBody(request);
    const incomingIds = cleanQuestionIds(body.questionIds);
    const currentIds = new Set(currentProgress.answeredQuestionIds);

    if (request.method === 'POST') {
      incomingIds.forEach((id) => currentIds.add(id));
    }

    if (request.method === 'DELETE') {
      if (incomingIds.length === 0) {
        currentIds.clear();
      } else {
        incomingIds.forEach((id) => currentIds.delete(id));
      }
    }

    const nextProgress = {
      answeredQuestionIds: Array.from(currentIds),
      updatedAt: new Date().toISOString(),
    };

    progressStore[user.id] = nextProgress;
    await writeJsonBlob('question-progress', progressStore);

    return sendJson(response, nextProgress);
  } catch (error) {
    console.error('Question progress tracking failed:', error);
    return sendJson(response, { error: 'Question progress service is unavailable.' }, 500);
  }
}
