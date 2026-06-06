import { useState, useEffect, useRef } from 'react';
import { Clock, Flag, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, BookOpen, ListOrdered, X } from 'lucide-react';
import { Question, QuizConfig, QuizSession, QuizQuestionState, RevisionRequest } from '../types';

interface ExamSimulatorProps {
  questions: Question[];
  onQuizSubmitted: (session: QuizSession) => void;
  onSubmitRevision: (req: RevisionRequest) => void;
}

export default function ExamSimulator({ questions, onQuizSubmitted, onSubmitRevision }: ExamSimulatorProps) {
  // Config states
  const [config, setConfig] = useState<QuizConfig>({
    category: 'all',
    questionCount: 10,
    mode: 'qna'
  });
  
  // Session states
  const [session, setSession] = useState<QuizSession | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  
  // Revision report state
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [issueText, setIssueText] = useState('');
  const [suggestedFixText, setSuggestedFixText] = useState('');
  
  const timerRef = useRef<any>(null);

  // Categories list
  const categories = ['all', ...Array.from(new Set(questions.map(q => q.category || 'General Nursing Practice')))];

  // Set default question count when category changes
  useEffect(() => {
    const available = getAvailableCount(config.category);
    if (config.questionCount > available) {
      setConfig(prev => ({ ...prev, questionCount: Math.min(10, available) }));
    }
  }, [config.category, questions]);

  // Handle timer countdown
  useEffect(() => {
    if (session && session.endTime === null) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            // Timer expired - auto submit
            clearInterval(timerRef.current!);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session]);

  const getAvailableCount = (cat: string) => {
    if (cat === 'all') return questions.length;
    return questions.filter(q => (q.category || 'General Nursing Practice') === cat).length;
  };

  const handleStartQuiz = () => {
    const filtered = config.category === 'all'
      ? [...questions]
      : questions.filter(q => (q.category || 'General Nursing Practice') === config.category);

    // Shuffle and pick N questions
    const shuffled = filtered.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.min(config.questionCount, filtered.length));

    if (selected.length === 0) {
      alert("No questions found in this category.");
      return;
    }

    const quizQuestions: QuizQuestionState[] = selected.map(q => ({
      question: q,
      selectedAnswer: null,
      isFlagged: false
    }));

    // Allow 60 seconds per question for PNLE simulation
    const totalTime = selected.length * 60;
    setTimerSeconds(totalTime);

    setSession({
      config,
      questions: quizQuestions,
      currentIndex: 0,
      startTime: Date.now(),
      endTime: null,
      score: null
    });
  };

  const handleSelectAnswer = (ans: 'A' | 'B' | 'C' | 'D') => {
    if (!session) return;
    
    const currentQ = session.questions[session.currentIndex];
    
    // In QnA mode, block changing answer once clicked
    if (session.config.mode === 'qna' && currentQ.selectedAnswer !== null) {
      return;
    }

    const updatedQuestions = [...session.questions];
    updatedQuestions[session.currentIndex] = {
      ...currentQ,
      selectedAnswer: ans,
      isCorrect: ans === currentQ.question.correctAnswer
    };

    setSession({
      ...session,
      questions: updatedQuestions
    });
  };

  const handleToggleFlag = () => {
    if (!session) return;
    const currentQ = session.questions[session.currentIndex];
    const updatedQuestions = [...session.questions];
    updatedQuestions[session.currentIndex] = {
      ...currentQ,
      isFlagged: !currentQ.isFlagged
    };
    setSession({
      ...session,
      questions: updatedQuestions
    });
  };

  const handleNext = () => {
    if (!session) return;
    if (session.currentIndex < session.questions.length - 1) {
      setSession({
        ...session,
        currentIndex: session.currentIndex + 1
      });
    } else {
      // Prompt submit
      setIsConfirmOpen(true);
    }
  };

  const handlePrev = () => {
    if (!session) return;
    if (session.currentIndex > 0) {
      setSession({
        ...session,
        currentIndex: session.currentIndex - 1
      });
    }
  };

  const handleJump = (index: number) => {
    if (!session) return;
    setSession({
      ...session,
      currentIndex: index
    });
  };

  const handleAutoSubmit = () => {
    alert("Time has expired! Your exam will be submitted automatically.");
    submitQuiz();
  };

  const submitQuiz = () => {
    if (!session) return;
    if (timerRef.current) clearInterval(timerRef.current);

    // Calculate score
    const correctCount = session.questions.reduce((count, qState) => {
      const isCorr = qState.selectedAnswer === qState.question.correctAnswer;
      return count + (isCorr ? 1 : 0);
    }, 0);

    const completedSession: QuizSession = {
      ...session,
      endTime: Date.now(),
      score: correctCount
    };

    onQuizSubmitted(completedSession);
    setSession(null);
    setIsConfirmOpen(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendRevision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueText.trim()) {
      alert("Please describe the issue.");
      return;
    }
    if (!session) return;
    const currentQ = session.questions[session.currentIndex].question;
    
    onSubmitRevision({
      id: `rev-${Date.now()}`,
      questionId: currentQ.id,
      questionText: currentQ.questionText,
      issueDescription: issueText,
      suggestedFix: suggestedFixText,
      date: new Date().toISOString()
    });
    
    setIsReportOpen(false);
    setIssueText('');
    setSuggestedFixText('');
  };

  // Render setup view
  if (!session) {
    const maxQuestions = getAvailableCount(config.category);
    return (
      <div className="flex flex-col gap-3">
        <div>
          <h2 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-heading)' }}>PNLE Practice Simulator</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Configure a custom practice quiz or timed examination.</p>
        </div>

        {questions.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
            <AlertTriangle size={48} style={{ color: 'var(--warning)', margin: '0 auto 16px' }} />
            <h3>No Questions Loaded</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px', maxWidth: '500px', marginInline: 'auto' }}>
              Your test bank is empty. Before running a simulation, please upload an Excel file in the <strong>Import</strong> section or add questions manually in the <strong>Question Bank</strong>.
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: '32px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
              <BookOpen style={{ color: 'var(--primary)' }} />
              Session Configuration
            </h3>

            <div className="quiz-config-grid">
              <div className="form-group">
                <label className="form-label">1. Select Subject / Board Area</label>
                <select
                  className="form-control"
                  value={config.category}
                  onChange={(e) => setConfig({ ...config, category: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <option value="all">All Subjects (Complete Board Coverage)</option>
                  {categories.filter(c => c !== 'all').map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                </select>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {maxQuestions} questions available in this category.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">2. Number of Questions</label>
                <input
                  type="number"
                  className="form-control"
                  min={1}
                  max={maxQuestions}
                  value={config.questionCount}
                  style={{ width: '100%' }}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val)) {
                      setConfig({ ...config, questionCount: Math.min(val, maxQuestions) });
                    }
                  }}
                />
                <div className="quick-pick-row">
                  {[5, 10, 25, 50, 100].map((num) => (
                    <button
                      key={num}
                      type="button"
                      className="btn btn-secondary quick-pick-btn"
                      disabled={num > maxQuestions}
                      onClick={() => setConfig({ ...config, questionCount: num })}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label">3. Select Quiz Mode</label>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div
                  className={`mode-selector-card ${config.mode === 'qna' ? 'selected' : ''}`}
                  onClick={() => setConfig({ ...config, mode: 'qna' })}
                >
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Q&A Mode (Instant Feedback)
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Ideal for learning and review. The correctness, correct answer, and full clinical rationale are displayed immediately after you select an answer for each question.
                  </p>
                </div>

                <div
                  className={`mode-selector-card ${config.mode === 'exam' ? 'selected' : ''}`}
                  onClick={() => setConfig({ ...config, mode: 'exam' })}
                >
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Exam Mode (Reveal at End)
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Simulates the actual board exam experience. No feedback is shown during the test. Bookmark flagged questions to review them later, and receive your total score and detailed rationales after submitting the completed exam.
                  </p>
                </div>
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleStartQuiz}
              style={{ width: '100%', padding: '14px', fontSize: '1.05rem' }}
            >
              Start Practice Session
            </button>
          </div>
        )}
      </div>
    );
  }

  // Active quiz view
  const currentQState = session.questions[session.currentIndex];
  const q = currentQState.question;
  const progressPercent = ((session.currentIndex + 1) / session.questions.length) * 100;
  const isAnswered = currentQState.selectedAnswer !== null;

  return (
    <div className="flex flex-col gap-3">
      {/* Header bar during testing */}
      <div className="quiz-header-bar card" style={{ padding: '12px 16px', borderRadius: 'var(--radius-sm)' }}>
        {/* Row 1: mode badge + category */}
        <div className="quiz-header-top">
          <span className="badge badge-info" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
            {session.config.mode === 'qna' ? 'Q&A Practice' : 'Exam Simulation'}
          </span>
          <span className="quiz-category-label">
            {q.category || 'General'}
          </span>
        </div>

        {/* Row 2: timer + action buttons */}
        <div className="quiz-header-actions">
          <div className="quiz-timer" style={{ color: timerSeconds < 60 ? 'var(--danger)' : 'var(--text-primary)' }}>
            <Clock size={16} />
            <span>{formatTime(timerSeconds)}</span>
          </div>
          <button 
            className="btn btn-secondary quiz-action-btn"
            onClick={() => setIsReportOpen(true)}
            style={{ color: 'var(--warning)', borderColor: 'var(--warning)' }}
            title="Report mistake or revision request"
          >
            <AlertTriangle size={14} />
            <span className="quiz-btn-label">Report Issue</span>
          </button>
          <button 
            className={`btn quiz-action-btn ${currentQState.isFlagged ? 'btn-danger' : 'btn-secondary'}`}
            onClick={handleToggleFlag}
          >
            <Flag size={14} />
            <span className="quiz-btn-label">{currentQState.isFlagged ? 'Flagged' : 'Flag'}</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
        <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.3s ease' }}></div>
      </div>

      <div className="quiz-layout">
        {/* Question Panel */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
          <div className="flex justify-between" style={{ marginBottom: '16px' }}>
            <span className="badge badge-primary" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
              Question {session.currentIndex + 1} of {session.questions.length}
            </span>
          </div>

          <h3 style={{ fontSize: '1.25rem', lineHeight: '1.5', fontWeight: '600', marginBottom: '24px' }}>
            {q.questionText}
          </h3>

          <div style={{ flex: 1 }}>
            {/* Option Choices */}
            {['A', 'B', 'C', 'D'].map((letter) => {
              const optText = letter === 'A' ? q.optionA : letter === 'B' ? q.optionB : letter === 'C' ? q.optionC : q.optionD;
              const isSelected = currentQState.selectedAnswer === letter;
              
              let choiceClass = '';
              if (isSelected) choiceClass = 'selected';

              // Q&A mode decorations
              if (session.config.mode === 'qna' && isAnswered) {
                if (letter === q.correctAnswer) {
                  choiceClass = 'correct';
                } else if (isSelected) {
                  choiceClass = 'incorrect';
                }
              }

              return (
                <button
                  key={letter}
                  className={`choice-btn ${choiceClass}`}
                  onClick={() => handleSelectAnswer(letter as 'A' | 'B' | 'C' | 'D')}
                  disabled={session.config.mode === 'qna' && isAnswered}
                >
                  <span className="choice-letter">{letter}</span>
                  <span>{optText}</span>
                </button>
              );
            })}
          </div>

          {/* Q&A Rationale Reveal */}
          {session.config.mode === 'qna' && isAnswered && q.rationale && (
            <div className="rationale-container">
              <div className="rationale-title">
                {currentQState.isCorrect ? (
                  <span style={{ color: 'var(--success)' }}>✓ Correct Choice: {q.correctAnswer}</span>
                ) : (
                  <span style={{ color: 'var(--danger)' }}>✗ Incorrect choice (Correct: {q.correctAnswer})</span>
                )}
                <span> — Clinical Rationale</span>
              </div>
              <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                {q.rationale}
              </p>
            </div>
          )}

          {/* Navigation footer */}
          <div className="flex justify-between" style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
            <button
              className="btn btn-secondary"
              onClick={handlePrev}
              disabled={session.currentIndex === 0}
            >
              <ChevronLeft size={18} />
              Previous
            </button>
            
            <button
              className="btn btn-primary"
              onClick={handleNext}
            >
              {session.currentIndex === session.questions.length - 1 ? 'Review & Submit' : 'Next'}
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Right side navigation drawer */}
        <div className="card" style={{ padding: '16px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', marginBottom: '16px' }}>
            <ListOrdered size={16} />
            Review Grid
          </h3>

          <div className="quiz-nav-grid" style={{ marginBottom: '24px' }}>
            {session.questions.map((qs, idx) => {
              let itemClass = '';
              if (idx === session.currentIndex) itemClass = 'active';
              else if (qs.isFlagged) itemClass = 'flagged';
              else if (qs.selectedAnswer !== null) {
                if (session.config.mode === 'qna') {
                  itemClass = qs.isCorrect ? 'correct' : 'incorrect';
                } else {
                  itemClass = 'answered';
                }
              }

              return (
                <button
                  key={idx}
                  className={`quiz-nav-item ${itemClass}`}
                  onClick={() => handleJump(idx)}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="quiz-nav-item active" style={{ width: '16px', height: '16px', cursor: 'default' }}></span>
              <span>Active Question</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="quiz-nav-item flagged" style={{ width: '16px', height: '16px', cursor: 'default' }}></span>
              <span>Flagged for Review</span>
            </div>
            {session.config.mode === 'qna' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="quiz-nav-item correct" style={{ width: '16px', height: '16px', cursor: 'default' }}></span>
                  <span>Answered Correctly</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="quiz-nav-item incorrect" style={{ width: '16px', height: '16px', cursor: 'default' }}></span>
                  <span>Answered Incorrectly</span>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="quiz-nav-item answered" style={{ width: '16px', height: '16px', cursor: 'default' }}></span>
                <span>Answered Questions</span>
              </div>
            )}
          </div>

          <button
            className="btn btn-primary"
            onClick={() => setIsConfirmOpen(true)}
            style={{ width: '100%', marginTop: '32px', padding: '12px' }}
          >
            Submit Exam
          </button>
        </div>
      </div>

      {/* Confirm Submission Modal */}
      {isConfirmOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px', textAlign: 'center' }}>
            <CheckCircle2 size={48} style={{ color: 'var(--primary)', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.4rem' }}>Submit Examination?</h3>
            
            {session.questions.some(qs => qs.selectedAnswer === null) ? (
              <p style={{ color: 'var(--danger)', marginTop: '8px', fontSize: '0.95rem' }}>
                Warning: You have unanswered questions! Submit anyway?
              </p>
            ) : (
              <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '0.95rem' }}>
                Are you ready to submit your answers and calculate your final PNLE score?
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => setIsConfirmOpen(false)}>
                Go Back
              </button>
              <button className="btn btn-primary" onClick={submitQuiz}>
                Yes, Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revision Request Modal */}
      {isReportOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem' }}>
                <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
                Submit Revision Request
              </h3>
              <button className="modal-close" onClick={() => { setIsReportOpen(false); setIssueText(''); setSuggestedFixText(''); }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSendRevision}>
              <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Question Stem
                </span>
                <p style={{ fontSize: '0.9rem', fontWeight: 500, lineHeight: 1.4 }}>
                  {q.questionText}
                </p>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Describe the Issue</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Explain what is wrong (e.g. incorrect answer key, spelling typo, rationale needs expansion...)"
                  value={issueText}
                  onChange={(e) => setIssueText(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Suggested Fix / Correct Answer (Optional)</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="What is the correct choices alignment or clinical fact?"
                  value={suggestedFixText}
                  onChange={(e) => setSuggestedFixText(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => { setIsReportOpen(false); setIssueText(''); setSuggestedFixText(''); }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
