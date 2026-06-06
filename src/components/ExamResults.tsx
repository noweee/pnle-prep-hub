import { useState } from 'react';
import { Check, X, ArrowLeft, RefreshCw, AlertCircle, Award, ListFilter, HelpCircle, AlertTriangle } from 'lucide-react';
import { QuizSession, Question, RevisionRequest } from '../types';

interface ExamResultsProps {
  session: QuizSession;
  onBackToDashboard: () => void;
  onRestartQuiz: () => void;
  onSubmitRevision: (req: RevisionRequest) => void;
}

export default function ExamResults({ session, onBackToDashboard, onRestartQuiz, onSubmitRevision }: ExamResultsProps) {
  const [activeReviewFilter, setActiveReviewFilter] = useState<'all' | 'correct' | 'incorrect' | 'flagged'>('all');
  
  // Revision report states
  const [selectedReportQuestion, setSelectedReportQuestion] = useState<Question | null>(null);
  const [issueText, setIssueText] = useState('');
  const [suggestedFixText, setSuggestedFixText] = useState('');
  
  const totalQuestions = session.questions.length;
  const correctCount = session.score || 0;
  const scorePercent = Math.round((correctCount / totalQuestions) * 100);
  
  // Time spent calculation
  const timeSpentSeconds = Math.round((session.endTime! - session.startTime) / 1000);
  const formatTimeSpent = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}m ${remainingSecs}s`;
  };

  const handleSendRevision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReportQuestion || !issueText.trim()) return;
    onSubmitRevision({
      id: `rev-${Date.now()}`,
      questionId: selectedReportQuestion.id,
      questionText: selectedReportQuestion.questionText,
      issueDescription: issueText,
      suggestedFix: suggestedFixText,
      date: new Date().toISOString()
    });
    setSelectedReportQuestion(null);
    setIssueText('');
    setSuggestedFixText('');
  };

  // PNLE Board Exam Standard is 75%
  const isPassed = scorePercent >= 75;

  // Category performance breakdown
  const categoryAnalysis: { [cat: string]: { total: number; correct: number } } = {};
  session.questions.forEach(qState => {
    const cat = qState.question.category || 'General Nursing Practice';
    if (!categoryAnalysis[cat]) {
      categoryAnalysis[cat] = { total: 0, correct: 0 };
    }
    categoryAnalysis[cat].total += 1;
    if (qState.selectedAnswer === qState.question.correctAnswer) {
      categoryAnalysis[cat].correct += 1;
    }
  });

  // Filtered questions for review list
  const filteredReview = session.questions.filter(qs => {
    if (activeReviewFilter === 'all') return true;
    if (activeReviewFilter === 'flagged') return qs.isFlagged;
    
    const isCorr = qs.selectedAnswer === qs.question.correctAnswer;
    if (activeReviewFilter === 'correct') return isCorr;
    if (activeReviewFilter === 'incorrect') return !isCorr;
    return true;
  });

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-heading)' }}>Exam Results Analysis</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Review your scoring metrics and rationale explanations.</p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Metric Summary Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <h3 className="card-title" style={{ justifyContent: 'center' }}>
            <Award style={{ color: 'var(--primary)' }} />
            Final Performance Score
          </h3>

          <div className="score-circle-container">
            <div 
              className="score-circle" 
              style={{ 
                background: `conic-gradient(var(${isPassed ? '--success' : '--danger'}) ${scorePercent}%, var(--bg-tertiary) ${scorePercent}%)` 
              }}
            >
              <div className="score-circle-text">
                <span className="score-circle-percent" style={{ color: isPassed ? 'var(--success)' : 'var(--danger)' }}>
                  {scorePercent}%
                </span>
                <div className="score-circle-label">
                  {correctCount} / {totalQuestions}
                </div>
              </div>
            </div>
          </div>

          <div style={{ margin: '16px 0' }}>
            {isPassed ? (
              <div className="badge badge-success" style={{ gap: '8px', padding: '10px 20px', fontSize: '1rem', borderRadius: 'var(--radius-md)' }}>
                <Check size={18} />
                PASSED (Board Standard)
              </div>
            ) : (
              <div className="badge badge-danger" style={{ gap: '8px', padding: '10px 20px', fontSize: '1rem', borderRadius: 'var(--radius-md)' }}>
                <X size={18} />
                FAILED (Threshold: 75%)
              </div>
            )}
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', padding: '0 12px' }}>
            {isPassed 
              ? "Congratulations! Your performance meets or exceeds the Philippine Nursing Licensure Exam (PNLE) passing criteria. Ready for the boards!"
              : "You scored below the 75% passing threshold required for the nursing boards. Focus on the rationales below and try again."}
          </p>

          <div className="flex justify-between" style={{ width: '100%', borderTop: '1px solid var(--border-color)', marginTop: '24px', paddingTop: '16px' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>TIME SPENT</span>
              <strong style={{ fontSize: '1.1rem' }}>{formatTimeSpent(timeSpentSeconds)}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>TEST MODE</span>
              <strong style={{ fontSize: '1.1rem', textTransform: 'uppercase' }}>
                {session.config.mode === 'qna' ? 'Practice' : 'Board Simulation'}
              </strong>
            </div>
          </div>
        </div>

        {/* Category Performance Analytics */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 className="card-title">
            <ListFilter style={{ color: 'var(--primary)' }} />
            Subject-wise Accuracy
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '20px' }}>
            Identify your strengths and developmental areas across the PNLE board parts.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            {Object.entries(categoryAnalysis).map(([catName, stats]) => {
              const catPercent = Math.round((stats.correct / stats.total) * 100);
              const catPassed = catPercent >= 75;
              return (
                <div key={catName} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div className="flex justify-between align-center" style={{ fontSize: '0.875rem' }}>
                    <span style={{ fontWeight: 600, maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={catName}>
                      {catName}
                    </span>
                    <span style={{ fontWeight: 700, color: catPassed ? 'var(--success)' : 'var(--danger)' }}>
                      {stats.correct}/{stats.total} ({catPercent}%)
                    </span>
                  </div>
                  
                  {/* Category mini bar */}
                  <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        width: `${catPercent}%`, 
                        height: '100%', 
                        background: catPassed ? 'var(--success)' : 'var(--danger)',
                        borderRadius: 'var(--radius-full)'
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Review Section */}
      <div className="card" style={{ marginTop: '16px' }}>
        <div className="flex justify-between align-center" style={{ marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HelpCircle style={{ color: 'var(--primary)' }} />
            Question Review Sheet
          </h3>

          {/* Filtering buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['all', 'correct', 'incorrect', 'flagged'] as const).map(filter => (
              <button
                key={filter}
                className={`btn ${activeReviewFilter === filter ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 12px', fontSize: '0.8rem', textTransform: 'capitalize' }}
                onClick={() => setActiveReviewFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* List of answers */}
        <div className="flex flex-col gap-3">
          {filteredReview.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
              No questions matched the review filter.
            </div>
          ) : (
            filteredReview.map((qs, index) => {
              const q = qs.question;
              const isUserCorrect = qs.selectedAnswer === q.correctAnswer;
              
              return (
                <div 
                  key={q.id} 
                  style={{ 
                    border: '1px solid var(--border-color)', 
                    borderLeft: `5px solid ${isUserCorrect ? 'var(--success)' : 'var(--danger)'}`,
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-primary)',
                    padding: '16px'
                  }}
                >
                  <div className="flex justify-between align-center" style={{ marginBottom: '10px' }}>
                    <span className="badge badge-primary">Q {index + 1}</span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setSelectedReportQuestion(q)}
                        style={{ padding: '2px 6px', fontSize: '0.7rem', color: 'var(--warning)', borderColor: 'var(--warning)', background: 'transparent' }}
                      >
                        Report Issue
                      </button>
                      {qs.isFlagged && <span className="badge badge-warning">Flagged</span>}
                      {isUserCorrect ? (
                        <span className="badge badge-success">Correct</span>
                      ) : (
                        <span className="badge badge-danger">Incorrect</span>
                      )}
                    </div>
                  </div>

                  <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', lineHeight: '1.4' }}>
                    {q.questionText}
                  </h4>

                  {/* Choice breakdown */}
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                    {['A', 'B', 'C', 'D'].map(letter => {
                      const text = letter === 'A' ? q.optionA : letter === 'B' ? q.optionB : letter === 'C' ? q.optionC : q.optionD;
                      
                      let letterClass = 'choice-letter';
                      let btnBorder = '1px solid var(--border-color)';
                      
                      if (letter === q.correctAnswer) {
                        btnBorder = '1.5px solid var(--success)';
                      } else if (qs.selectedAnswer === letter) {
                        btnBorder = '1.5px solid var(--danger)';
                      }

                      return (
                        <div 
                          key={letter} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px', 
                            padding: '10px 14px', 
                            borderRadius: 'var(--radius-sm)',
                            border: btnBorder,
                            background: 'var(--bg-secondary)',
                            fontSize: '0.875rem'
                          }}
                        >
                          <span 
                            className={letterClass} 
                            style={{ 
                              width: '24px', 
                              height: '24px', 
                              fontSize: '0.8rem',
                              background: letter === q.correctAnswer 
                                ? 'var(--success)' 
                                : qs.selectedAnswer === letter 
                                  ? 'var(--danger)' 
                                  : 'var(--bg-tertiary)',
                              color: letter === q.correctAnswer || qs.selectedAnswer === letter ? '#ffffff' : 'var(--text-secondary)'
                            }}
                          >
                            {letter}
                          </span>
                          <span>{text}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Rationale */}
                  {q.rationale && (
                    <div 
                      className="rationale-container" 
                      style={{ 
                        marginTop: '12px', 
                        background: 'var(--bg-tertiary)', 
                        borderLeftColor: 'var(--primary)',
                        padding: '12px' 
                      }}
                    >
                      <div className="rationale-title" style={{ color: 'var(--primary)' }}>
                        <AlertCircle size={14} />
                        Rationale & Explanation
                      </div>
                      <p style={{ color: 'var(--text-primary)', fontSize: '0.85rem', lineHeight: '1.4' }}>
                        {q.rationale}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer controls */}
      <div className="flex justify-between" style={{ marginTop: '24px' }}>
        <button className="btn btn-secondary" onClick={onBackToDashboard} style={{ padding: '12px 24px' }}>
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>

        <button className="btn btn-primary" onClick={onRestartQuiz} style={{ padding: '12px 24px' }}>
          <RefreshCw size={18} />
          Take Another Test
        </button>
      </div>

      {/* Revision Request Modal */}
      {selectedReportQuestion && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem' }}>
                <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
                Submit Revision Request
              </h3>
              <button className="modal-close" onClick={() => { setSelectedReportQuestion(null); setIssueText(''); setSuggestedFixText(''); }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSendRevision}>
              <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Question Stem
                </span>
                <p style={{ fontSize: '0.9rem', fontWeight: 500, lineHeight: 1.4 }}>
                  {selectedReportQuestion.questionText}
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
                  onClick={() => { setSelectedReportQuestion(null); setIssueText(''); setSuggestedFixText(''); }}
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
