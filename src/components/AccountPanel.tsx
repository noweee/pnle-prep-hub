import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Activity, Award, BarChart3, ListChecks, LogIn, LogOut, RotateCcw, TrendingUp, UserPlus, UserRound } from 'lucide-react';
import { ExamHistoryItem, Question, RankingStats, User } from '../types';
import { registerAccount, signIn, signOut } from '../lib/authApi';

interface AccountPanelProps {
  user: User | null;
  history: ExamHistoryItem[];
  ranking: RankingStats | null;
  questions: Question[];
  answeredQuestionIds: string[];
  onResetAnsweredQuestions: (category: string) => Promise<void>;
  onUserChange: (user: User | null) => void;
}

function getPerformanceLevel(avgScore: number, examsTaken: number) {
  if (examsTaken === 0) return 'Unranked';
  if (avgScore >= 90) return 'Elite Review';
  if (avgScore >= 85) return 'Advanced';
  if (avgScore >= 75) return 'Board-Ready';
  if (avgScore >= 60) return 'Building';
  return 'Foundation';
}

function getRecentTrend(history: ExamHistoryItem[]) {
  if (history.length < 2) return 0;

  const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const recent = sorted.slice(-3);
  const previous = sorted.slice(Math.max(0, sorted.length - 6), Math.max(0, sorted.length - 3));

  if (previous.length === 0) {
    return recent[recent.length - 1].scorePercent - sorted[0].scorePercent;
  }

  const recentAvg = Math.round(recent.reduce((sum, item) => sum + item.scorePercent, 0) / recent.length);
  const previousAvg = Math.round(previous.reduce((sum, item) => sum + item.scorePercent, 0) / previous.length);
  return recentAvg - previousAvg;
}

function getProfileStats(history: ExamHistoryItem[]) {
  const examsTaken = history.length;
  const avgScore = examsTaken > 0
    ? Math.round(history.reduce((sum, item) => sum + item.scorePercent, 0) / examsTaken)
    : 0;
  const passedCount = history.filter((item) => item.scorePercent >= 75).length;
  const passRate = examsTaken > 0 ? Math.round((passedCount / examsTaken) * 100) : 0;
  const bestScore = examsTaken > 0 ? Math.max(...history.map((item) => item.scorePercent)) : 0;

  const subjectMap = new Map<string, ExamHistoryItem[]>();
  history.forEach((item) => {
    const subject = item.categoryName === 'all' ? 'All Subjects' : item.categoryName;
    subjectMap.set(subject, [...(subjectMap.get(subject) || []), item]);
  });

  const subjectStats = Array.from(subjectMap.entries()).map(([subject, attempts]) => {
    const sortedAttempts = [...attempts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstScore = sortedAttempts[0].scorePercent;
    const latestScore = sortedAttempts[sortedAttempts.length - 1].scorePercent;
    const averageScore = Math.round(sortedAttempts.reduce((sum, item) => sum + item.scorePercent, 0) / sortedAttempts.length);

    return {
      subject,
      attempts: sortedAttempts.length,
      firstScore,
      latestScore,
      averageScore,
      improvement: latestScore - firstScore,
    };
  }).sort((a, b) => b.latestScore - a.latestScore);

  return {
    examsTaken,
    avgScore,
    passRate,
    bestScore,
    performanceLevel: getPerformanceLevel(avgScore, examsTaken),
    trend: getRecentTrend(history),
    bestSubject: subjectStats[0]?.subject || 'No subject data yet',
    subjectStats,
  };
}

function getQuestionCoverage(questions: Question[], answeredQuestionIds: string[]) {
  const answeredSet = new Set(answeredQuestionIds);
  const totalQuestions = questions.length;
  const answeredCount = questions.filter((question) => answeredSet.has(question.id)).length;
  const answeredPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const subjectMap = new Map<string, { total: number; answered: number }>();

  questions.forEach((question) => {
    const subject = question.category || 'General Nursing Practice';
    const current = subjectMap.get(subject) || { total: 0, answered: 0 };
    current.total += 1;
    if (answeredSet.has(question.id)) {
      current.answered += 1;
    }
    subjectMap.set(subject, current);
  });

  const subjectCoverage = Array.from(subjectMap.entries())
    .map(([subject, item]) => ({
      subject,
      total: item.total,
      answered: item.answered,
      percent: item.total > 0 ? Math.round((item.answered / item.total) * 100) : 0,
    }))
    .sort((a, b) => b.percent - a.percent || a.subject.localeCompare(b.subject));

  return {
    totalQuestions,
    answeredCount,
    answeredPercent,
    subjectCoverage,
  };
}

export default function AccountPanel({
  user,
  history,
  ranking,
  questions,
  answeredQuestionIds,
  onResetAnsweredQuestions,
  onUserChange,
}: AccountPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [resettingSubject, setResettingSubject] = useState('');
  const profileStats = useMemo(() => getProfileStats(history), [history]);
  const questionCoverage = useMemo(
    () => getQuestionCoverage(questions, answeredQuestionIds),
    [questions, answeredQuestionIds]
  );
  const rankLabel = ranking?.rank
    ? `#${ranking.rank} of ${ranking.totalRankedUsers}`
    : 'Unranked';

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsBusy(true);
    setError('');

    try {
      const nextUser = mode === 'register'
        ? await registerAccount(name, email, password)
        : await signIn(email, password);

      onUserChange(nextUser);
      resetForm();
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Account request failed.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleResetSubject = async (subject: string) => {
    const shouldReset = window.confirm(
      `Reset answered-question tracking for ${subject}? This lets this profile receive those questions again.`
    );

    if (!shouldReset) return;

    setResettingSubject(subject);
    try {
      await onResetAnsweredQuestions(subject);
    } finally {
      setResettingSubject('');
    }
  };

  const handleSignOut = async () => {
    setIsBusy(true);
    try {
      await signOut();
      onUserChange(null);
      setIsOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unable to sign out.');
    } finally {
      setIsBusy(false);
    }
  };

  if (user) {
    const profileModal = isOpen ? createPortal(
      <div className="account-modal-overlay">
        <div className="account-modal-panel profile-modal-panel">
          <div className="modal-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem' }}>
              <UserRound size={18} />
              Profile
            </h3>
            <button className="modal-close" onClick={() => setIsOpen(false)}>
              X
            </button>
          </div>

          <div className="profile-header">
            <div className="profile-avatar">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h4 style={{ fontSize: '1.1rem', marginBottom: '2px' }}>{user.name}</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{user.email}</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                <span className={`badge ${user.isEnabled ? 'badge-success' : 'badge-warning'}`}>
                  {user.isEnabled ? 'Enabled' : 'Pending Approval'}
                </span>
                {user.isAdmin && <span className="badge badge-info">Admin</span>}
              </div>
            </div>
          </div>

          <div className="profile-stats-grid">
            <div className="profile-stat-card">
              <Award size={18} />
              <span>Rank</span>
              <strong>{rankLabel}</strong>
            </div>
            <div className="profile-stat-card">
              <Activity size={18} />
              <span>Average</span>
              <strong>{profileStats.avgScore}%</strong>
            </div>
            <div className="profile-stat-card">
              <TrendingUp size={18} />
              <span>Recent Trend</span>
              <strong style={{ color: profileStats.trend >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {profileStats.trend >= 0 ? '+' : ''}{profileStats.trend}%
              </strong>
            </div>
            <div className="profile-stat-card">
              <BarChart3 size={18} />
              <span>Pass Rate</span>
              <strong>{profileStats.passRate}%</strong>
            </div>
            <div className="profile-stat-card">
              <ListChecks size={18} />
              <span>Questions Answered</span>
              <strong>{questionCoverage.answeredPercent}%</strong>
            </div>
          </div>

          <div className="profile-summary-row">
            <div>
              <span>Best Score</span>
              <strong>{profileStats.bestScore}%</strong>
            </div>
            <div>
              <span>Exams Taken</span>
              <strong>{profileStats.examsTaken}</strong>
            </div>
            <div>
              <span>Level</span>
              <strong>{profileStats.performanceLevel}</strong>
            </div>
            <div>
              <span>Strongest Subject</span>
              <strong>{profileStats.bestSubject}</strong>
            </div>
          </div>

          <div className="profile-section">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <ListChecks size={16} />
              Question Coverage
            </h4>
            {questionCoverage.totalQuestions === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Import questions to start tracking coverage.
              </p>
            ) : (
              <div className="profile-subject-list">
                <div className="profile-subject-row">
                  <div className="profile-subject-label">
                    <strong>All Subjects</strong>
                    <span>
                      {questionCoverage.answeredCount} of {questionCoverage.totalQuestions} answered
                    </span>
                  </div>
                  <div className="profile-subject-meter">
                    <div style={{ width: `${Math.max(4, questionCoverage.answeredPercent)}%` }} />
                  </div>
                  <span className="badge badge-info">{questionCoverage.answeredPercent}%</span>
                </div>

                {questionCoverage.subjectCoverage.map((subject) => (
                  <div key={subject.subject} className="profile-subject-row">
                    <div className="profile-subject-label">
                      <strong title={subject.subject}>{subject.subject}</strong>
                      <span>
                        {subject.answered} of {subject.total} answered
                      </span>
                    </div>
                    <div className="profile-subject-meter">
                      <div style={{ width: `${Math.max(4, subject.percent)}%` }} />
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary profile-reset-topic-btn"
                      disabled={subject.answered === 0 || resettingSubject === subject.subject}
                      onClick={() => handleResetSubject(subject.subject)}
                    >
                      <RotateCcw size={14} />
                      {resettingSubject === subject.subject ? 'Resetting...' : 'Reset'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="profile-section">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <BarChart3 size={16} />
              Subject Improvement
            </h4>
            {profileStats.subjectStats.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Complete a practice exam to build your improvement graph.
              </p>
            ) : (
              <div className="profile-subject-list">
                {profileStats.subjectStats.slice(0, 6).map((subject) => (
                  <div key={subject.subject} className="profile-subject-row">
                    <div className="profile-subject-label">
                      <strong title={subject.subject}>{subject.subject}</strong>
                      <span>
                        {subject.attempts} attempt{subject.attempts === 1 ? '' : 's'} • {subject.firstScore}% to {subject.latestScore}%
                      </span>
                    </div>
                    <div className="profile-subject-meter">
                      <div style={{ width: `${Math.max(4, subject.latestScore)}%` }} />
                    </div>
                    <span className={`badge ${subject.improvement >= 0 ? 'badge-success' : 'badge-danger'}`}>
                      {subject.improvement >= 0 ? '+' : ''}{subject.improvement}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            className="btn btn-secondary profile-signout-btn"
            onClick={handleSignOut}
            disabled={isBusy}
          >
            <LogOut size={16} />
            {isBusy ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </div>,
      document.body
    ) : null;

    return (
      <>
        <button className="nav-button" onClick={() => setIsOpen(true)} title="Open profile">
          <UserRound size={16} />
          <span>{user.name}{!user.isEnabled ? ' (Pending)' : ''}</span>
        </button>
        {profileModal}
      </>
    );
  }

  const accountModal = isOpen ? createPortal(
    <div className="account-modal-overlay">
      <div className="account-modal-panel">
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem' }}>
            {mode === 'register' ? <UserPlus size={18} /> : <LogIn size={18} />}
            {mode === 'register' ? 'Create Student Account' : 'Student Login'}
          </h3>
          <button className="modal-close" onClick={() => { setIsOpen(false); resetForm(); }}>
            X
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Name</label>
              <input
                className="form-control"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
              />
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              required
            />
          </div>

          {error && (
            <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '12px' }}>
              {error}
            </p>
          )}

          {mode === 'register' && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '12px' }}>
              New accounts are pending by default. An admin must enable access before questions can be opened.
            </p>
          )}

          <button type="submit" className="btn btn-primary" disabled={isBusy} style={{ width: '100%', padding: '12px' }}>
            {isBusy ? 'Please wait...' : mode === 'register' ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <button
          type="button"
          className="btn btn-secondary"
          style={{ width: '100%', marginTop: '12px' }}
          onClick={() => {
            setMode(mode === 'register' ? 'login' : 'register');
            setError('');
          }}
        >
          {mode === 'register' ? 'Already have an account? Sign in' : 'Need an account? Register'}
        </button>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button className="nav-button" onClick={() => setIsOpen(true)}>
        <LogIn size={16} />
        <span>Student Login</span>
      </button>

      {accountModal}
    </>
  );
}
