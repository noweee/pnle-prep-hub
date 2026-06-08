import { get, put } from '@vercel/blob';

const STORE_PATH = 'pnle-prep-hub/questions.json';

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

async function readQuestions() {
  try {
    const result = await get(STORE_PATH, { access: 'private' });

    if (!result || result.statusCode !== 200 || !result.stream) {
      return [];
    }

    const text = await new Response(result.stream).text();
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error?.name === 'BlobNotFoundError') {
      return [];
    }

    throw error;
  }
}

async function writeQuestions(questions) {
  await put(STORE_PATH, JSON.stringify(questions, null, 2), {
    access: 'private',
    allowOverwrite: true,
    contentType: 'application/json',
  });
}

export async function GET() {
  try {
    const questions = await readQuestions();
    return json({ questions });
  } catch (error) {
    console.error('Unable to load shared question bank:', error);
    return json({ error: 'Unable to load shared question bank.' }, 500);
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const questions = body?.questions;

    if (!Array.isArray(questions)) {
      return json({ error: 'Request body must include a questions array.' }, 400);
    }

    await writeQuestions(questions);
    return json({ questions });
  } catch (error) {
    console.error('Unable to save shared question bank:', error);
    return json({ error: 'Unable to save shared question bank.' }, 500);
  }
}
