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

function getUserRanking(scores, userId) {
  const byUser = new Map();

  scores.forEach((score) => {
    const scoreUserId = String(score.userId || '');
    if (!scoreUserId) return;

    const existing = byUser.get(scoreUserId) || {
      userId: scoreUserId,
      examsTaken: 0,
      scoreTotal: 0,
    };

    existing.examsTaken += 1;
    existing.scoreTotal += Number(score.scorePercent || 0);
    byUser.set(scoreUserId, existing);
  });

  const rankedUsers = Array.from(byUser.values())
    .map((item) => ({
      userId: item.userId,
      examsTaken: item.examsTaken,
      averageScore: item.examsTaken > 0 ? Math.round(item.scoreTotal / item.examsTaken) : 0,
    }))
    .sort((a, b) => {
      if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
      if (b.examsTaken !== a.examsTaken) return b.examsTaken - a.examsTaken;
      return a.userId.localeCompare(b.userId);
    });

  const userIndex = rankedUsers.findIndex((item) => item.userId === userId);
  const userRank = userIndex >= 0 ? rankedUsers[userIndex] : null;

  return {
    rank: userIndex >= 0 ? userIndex + 1 : null,
    totalRankedUsers: rankedUsers.length,
    averageScore: userRank?.averageScore || 0,
    examsTaken: userRank?.examsTaken || 0,
  };
}

export default async function handler(request, response) {
  try {
    const user = await getSignedInUser(request);

    if (!user) {
      return sendJson(response, { error: 'Please sign in to track scores.' }, 401);
    }

    if (!user.isEnabled && !user.isAdmin) {
      return sendJson(response, { error: 'Your account is pending admin approval.' }, 403);
    }

    const scores = await readJsonBlob('scores', []);

    if (request.method === 'GET') {
      const userScores = scores
        .filter((score) => score.userId === user.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return sendJson(response, { scores: userScores, ranking: getUserRanking(scores, user.id) });
    }

    if (request.method === 'DELETE') {
      const remaining = scores.filter((score) => score.userId !== user.id);
      await writeJsonBlob('scores', remaining);
      return sendJson(response, { scores: [], ranking: getUserRanking(remaining, user.id) });
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

    return sendJson(response, { scores: userScores, score, ranking: getUserRanking(scores, user.id) }, 201);
  } catch (error) {
    console.error('Score tracking failed:', error);
    return sendJson(response, { error: 'Score tracking service is unavailable.' }, 500);
  }
}
