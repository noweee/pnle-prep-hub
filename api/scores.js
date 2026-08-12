import {
  getSignedInUser,
  makeId,
  readJsonBlob,
  sendJson,
  writeJsonBlob,
} from './_shared.js';

function readBody(request) {
  return typeof request.body === 'object' && request.body !== null ? request.body : {};
}

export default async function handler(request, response) {
  try {
    const user = await getSignedInUser(request);

    if (!user) {
      return sendJson(response, { error: 'Please sign in to track scores.' }, 401);
    }

    const scores = await readJsonBlob('scores', []);

    if (request.method === 'GET') {
      const userScores = scores
        .filter((score) => score.userId === user.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return sendJson(response, { scores: userScores });
    }

    if (request.method === 'DELETE') {
      const remaining = scores.filter((score) => score.userId !== user.id);
      await writeJsonBlob('scores', remaining);
      return sendJson(response, { scores: [] });
    }

    if (request.method !== 'POST') {
      response.setHeader('Allow', 'GET, POST, DELETE');
      return sendJson(response, { error: 'Method not allowed.' }, 405);
    }

    const body = readBody(request);
    const score = {
      id: makeId('score'),
      userId: user.id,
      date: new Date().toISOString(),
      categoryName: String(body.categoryName || 'all'),
      questionCount: Number(body.questionCount || 0),
      correctCount: Number(body.correctCount || 0),
      scorePercent: Number(body.scorePercent || 0),
      timeSpentSeconds: Number(body.timeSpentSeconds || 0),
      mode: body.mode === 'exam' ? 'exam' : 'qna',
    };

    if (score.questionCount <= 0) {
      return sendJson(response, { error: 'Score must include at least one question.' }, 400);
    }

    scores.push(score);
    await writeJsonBlob('scores', scores);

    const userScores = scores
      .filter((item) => item.userId === user.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return sendJson(response, { scores: userScores, score }, 201);
  } catch (error) {
    console.error('Score tracking failed:', error);
    return sendJson(response, { error: 'Score tracking service is unavailable.' }, 500);
  }
}
