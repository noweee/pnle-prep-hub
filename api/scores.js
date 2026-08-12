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

function emptyRankingPeriod() {
  return {
    rank: null,
    totalRankedUsers: 0,
    rankingScore: 0,
    examsTaken: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
    averageScore: 0,
    accuracy: 0,
    passRate: 0,
  };
}

function getPeriodStart(period) {
  const now = new Date();
  if (period === 'daily') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }
  if (period === 'weekly') {
    return now.getTime() - 1000 * 60 * 60 * 24 * 7;
  }
  if (period === 'monthly') {
    return now.getTime() - 1000 * 60 * 60 * 24 * 30;
  }
  return 0;
}

function scoreBelongsToSubject(score, subject) {
  if (!subject) return true;
  if (subject === 'All Subjects') return score.categoryName === 'all';
  return score.categoryName === subject;
}

function getRankingPeriod(scores, userId, period = 'allTime', subject = '') {
  const byUser = new Map();
  const startTime = getPeriodStart(period);

  scores.forEach((score) => {
    if (new Date(score.date).getTime() < startTime) return;
    if (!scoreBelongsToSubject(score, subject)) return;

    const scoreUserId = String(score.userId || '');
    if (!scoreUserId) return;

    const existing = byUser.get(scoreUserId) || {
      userId: scoreUserId,
      examsTaken: 0,
      scoreTotal: 0,
      questionsAnswered: 0,
      correctAnswers: 0,
      passedCount: 0,
    };

    const questionCount = Number(score.questionCount || 0);
    const correctCount = Number(score.correctCount || 0);

    existing.examsTaken += 1;
    existing.scoreTotal += Number(score.scorePercent || 0);
    existing.questionsAnswered += questionCount;
    existing.correctAnswers += correctCount;
    if (Number(score.scorePercent || 0) >= 75) {
      existing.passedCount += 1;
    }
    byUser.set(scoreUserId, existing);
  });

  const rankedUsers = Array.from(byUser.values())
    .map((item) => ({
      userId: item.userId,
      examsTaken: item.examsTaken,
      questionsAnswered: item.questionsAnswered,
      correctAnswers: item.correctAnswers,
      averageScore: item.examsTaken > 0 ? Math.round(item.scoreTotal / item.examsTaken) : 0,
      accuracy: item.questionsAnswered > 0 ? Math.round((item.correctAnswers / item.questionsAnswered) * 100) : 0,
      passRate: item.examsTaken > 0 ? Math.round((item.passedCount / item.examsTaken) * 100) : 0,
    }))
    .map((item) => ({
      ...item,
      rankingScore: Math.round(
        (item.correctAnswers * 10)
        + (item.questionsAnswered * 2)
        + (item.averageScore * 4)
        + (item.accuracy * 3)
        + (item.passRate * 2)
        + (item.examsTaken * 5)
      ),
    }))
    .sort((a, b) => {
      if (b.rankingScore !== a.rankingScore) return b.rankingScore - a.rankingScore;
      if (b.correctAnswers !== a.correctAnswers) return b.correctAnswers - a.correctAnswers;
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      if (b.examsTaken !== a.examsTaken) return b.examsTaken - a.examsTaken;
      return a.userId.localeCompare(b.userId);
    });

  const userIndex = rankedUsers.findIndex((item) => item.userId === userId);
  const userRank = userIndex >= 0 ? rankedUsers[userIndex] : null;

  if (!userRank) return emptyRankingPeriod();

  return {
    rank: userIndex >= 0 ? userIndex + 1 : null,
    totalRankedUsers: rankedUsers.length,
    rankingScore: userRank.rankingScore,
    examsTaken: userRank.examsTaken,
    questionsAnswered: userRank.questionsAnswered,
    correctAnswers: userRank.correctAnswers,
    averageScore: userRank.averageScore,
    accuracy: userRank.accuracy,
    passRate: userRank.passRate,
  };
}

function getUserRanking(scores, userId) {
  const allTime = getRankingPeriod(scores, userId, 'allTime');
  const subjects = Array.from(new Set(scores.map((score) => score.categoryName === 'all' ? 'All Subjects' : score.categoryName)))
    .filter(Boolean)
    .map((subject) => ({
      subject,
      ...getRankingPeriod(scores, userId, 'allTime', subject),
    }))
    .filter((subjectRanking) => subjectRanking.examsTaken > 0)
    .sort((a, b) => (a.rank || 999999) - (b.rank || 999999) || b.rankingScore - a.rankingScore);

  return {
    ...allTime,
    daily: getRankingPeriod(scores, userId, 'daily'),
    weekly: getRankingPeriod(scores, userId, 'weekly'),
    monthly: getRankingPeriod(scores, userId, 'monthly'),
    allTime,
    subjects,
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
