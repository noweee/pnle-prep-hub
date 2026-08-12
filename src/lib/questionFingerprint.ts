import { Question } from '../types';

function normalizeQuestionPart(value: string | undefined) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getQuestionFingerprint(question: Pick<Question, 'questionText' | 'optionA' | 'optionB' | 'optionC' | 'optionD'>) {
  return [
    normalizeQuestionPart(question.questionText),
    normalizeQuestionPart(question.optionA),
    normalizeQuestionPart(question.optionB),
    normalizeQuestionPart(question.optionC),
    normalizeQuestionPart(question.optionD),
  ].join('|');
}

export function getParsedQuestionFingerprint(row: {
  question: string;
  optA: string;
  optB: string;
  optC: string;
  optD: string;
}) {
  return [
    normalizeQuestionPart(row.question),
    normalizeQuestionPart(row.optA),
    normalizeQuestionPart(row.optB),
    normalizeQuestionPart(row.optC),
    normalizeQuestionPart(row.optD),
  ].join('|');
}
