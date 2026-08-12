import { useState, useEffect } from 'react';
import { BookOpen, FileSpreadsheet, Play, LayoutDashboard, Sun, Moon, Lock, Users } from 'lucide-react';
import { Question, ExamHistoryItem, QuizSession, RankingStats, RevisionRequest, User } from './types';

// Importing components
import Dashboard from './components/Dashboard';
import ExcelUpload from './components/ExcelUpload';
import TestBankManager from './components/TestBankManager';
import ExamSimulator from './components/ExamSimulator';
import ExamResults from './components/ExamResults';
import AccountPanel from './components/AccountPanel';
import AdminUsersPanel from './components/AdminUsersPanel';
import { fetchCurrentUser } from './lib/authApi';
import { fetchSharedQuestions, saveSharedQuestions } from './lib/questionBankApi';
import { fetchQuestionProgress, markAnsweredQuestions, resetAnsweredQuestions } from './lib/progressApi';
import { clearScores, fetchScores, saveScore } from './lib/scoreApi';
import { getQuestionFingerprint } from './lib/questionFingerprint';

const INITIAL_SAMPLE_QUESTIONS: Question[] = [
  {
    id: "sample-1",
    questionText: "A client is admitted with a diagnosis of acute pancreatitis. Which of the following laboratory values should the nurse expect to be elevated?",
    optionA: "Serum calcium",
    optionB: "Serum amylase",
    optionC: "Blood urea nitrogen",
    optionD: "Serum potassium",
    correctAnswer: "B",
    rationale: "Serum amylase and lipase are digestive enzymes produced by the pancreas. In acute pancreatitis, pancreatic cells are damaged, causing these enzymes to leak into the blood, resulting in elevated levels.",
    category: "NP III: Care of Clients with Physiologic and Psychosocial Alterations (Part A)"
  },
  {
    id: "sample-2",
    questionText: "Which of the following is the primary responsibility of a community health nurse?",
    optionA: "Providing acute bedside care in hospitals",
    optionB: "Performing specialized minor surgical procedures",
    optionC: "Health promotion, disease prevention, and education in the community",
    optionD: "Administering complex chemotherapy treatments in outpatient clinics",
    correctAnswer: "C",
    rationale: "Community health nursing focuses on population-based health, where the primary emphasis is on promoting wellness and preventing disease through education, immunization, and community-wide safety campaigns.",
    category: "NP II: Community Health Nursing and Care of the Mother and Child"
  },
  {
    id: "sample-3",
    questionText: "According to the Philippine Nursing Act of 2002 (RA 9173), what is the minimum educational requirement for a Dean of a College of Nursing?",
    optionA: "Bachelor of Science in Nursing",
    optionB: "Master of Arts in Nursing (or Master of Science in Nursing)",
    optionC: "Doctor of Philosophy in Nursing Education",
    optionD: "Master of Science in Public Health Education",
    correctAnswer: "B",
    rationale: "Republic Act 9173 (Philippine Nursing Law) specifies that a Dean of a College of Nursing in the Philippines must hold a Master's degree in nursing (MAN/MSN) and have at least 5 years of teaching experience.",
    category: "NP I: Foundation of Professional Nursing Practice"
  },
  {
    id: "sample-4",
    questionText: "A nurse is caring for a client receiving blood transfusion. The client suddenly develops chills, fever, and low back pain. Which action should the nurse take first?",
    optionA: "Slow down the transfusion rate to 50 mL/hour",
    optionB: "Administer oral acetaminophen to relieve fever and pain",
    optionC: "Stop the transfusion immediately",
    optionD: "Notify the attending physician and blood bank clerk",
    correctAnswer: "C",
    rationale: "Chills, fever, and low back pain indicate a potential acute hemolytic transfusion reaction. The immediate priority is to stop the transfusion to prevent further infusing of incompatible blood, which can cause renal failure.",
    category: "NP IV: Care of Clients with Physiologic and Psychosocial Alterations (Part B)"
  },
  {
    id: "sample-5",
    questionText: "A patient with major depressive disorder is prescribed an SSRI. The nurse should instruct the patient to monitor for which critical, life-threatening syndrome?",
    optionA: "Serotonin syndrome (agitation, fever, tremors, hyperreflexia)",
    optionB: "Hypertensive crisis triggered by tyramine-rich foods (aged cheese)",
    optionC: "Neuroleptic malignant syndrome (rigidity, hyperpyrexia)",
    optionD: "Agranulocytosis (sudden drop in white blood cell count)",
    correctAnswer: "A",
    rationale: "SSRI side effects include Serotonin Syndrome, characterized by cognitive alterations (agitation, confusion), autonomic hyperactivity (sweating, fever), and neuromuscular abnormalities (tremors, hyperreflexia).",
    category: "NP V: Care of Clients with Physiologic and Psychosocial Alterations (Part C)"
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bank' | 'upload' | 'quiz' | 'results' | 'users'>('dashboard');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isQuestionBankLoading, setIsQuestionBankLoading] = useState(true);
  const [questionBankError, setQuestionBankError] = useState('');
  const [history, setHistory] = useState<ExamHistoryItem[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAccountLoading, setIsAccountLoading] = useState(true);
  const [scoreSyncError, setScoreSyncError] = useState('');
  const [rankingStats, setRankingStats] = useState<RankingStats | null>(null);
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<string[]>([]);
  const [revisionRequests, setRevisionRequests] = useState<RevisionRequest[]>([]);
  const [completedSession, setCompletedSession] = useState<QuizSession | null>(null);

  // Theme state
  const [darkMode, setDarkMode] = useState(true);
  const canManageQuestions = Boolean(currentUser?.isAdmin);

  // Load state on mount
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);

    const loadQuestionBank = async () => {
      try {
        const cachedQs = localStorage.getItem('pnle_questions');
        let localQuestions: Question[] = [];

        if (cachedQs) {
          try {
            const parsedQuestions = JSON.parse(cachedQs);
            localQuestions = Array.isArray(parsedQuestions) ? parsedQuestions : [];
          } catch (e) {
            console.error("Error reading local questions for migration:", e);
          }
        }

        const sharedQuestions = await fetchSharedQuestions();

        if (sharedQuestions.length > 0) {
          setQuestions(sharedQuestions);
        } else {
          const seedQuestions = localQuestions.length > 0 ? localQuestions : INITIAL_SAMPLE_QUESTIONS;
          const seededQuestions = await saveSharedQuestions(seedQuestions);
          setQuestions(seededQuestions.length > 0 ? seededQuestions : seedQuestions);
        }

        localStorage.removeItem('pnle_questions');
        setQuestionBankError('');
      } catch (e) {
        console.error("Error loading shared questions:", e);
        setQuestions(INITIAL_SAMPLE_QUESTIONS);
        setQuestionBankError('The shared question bank could not be reached. Changes will not sync across devices until storage is configured.');
      } finally {
        setIsQuestionBankLoading(false);
      }
    };

    loadQuestionBank();

    const loadAccount = async () => {
      try {
        const user = await fetchCurrentUser();
        setCurrentUser(user);

        if (user) {
          if (user.isEnabled || user.isAdmin) {
            const [scoreData, questionProgress] = await Promise.all([
              fetchScores(),
              fetchQuestionProgress(),
            ]);
            setHistory(scoreData.scores);
            setRankingStats(scoreData.ranking);
            setAnsweredQuestionIds(questionProgress);
          } else {
            setHistory([]);
            setRankingStats(null);
            setAnsweredQuestionIds([]);
          }
          localStorage.removeItem('pnle_history');
        }
      } catch (e) {
        console.error("Error loading account:", e);
        setScoreSyncError('Account score history could not be loaded. Sign in again if scoring does not update.');
      } finally {
        setIsAccountLoading(false);
      }
    };

    loadAccount();

    // Load revisions
    const cachedRevisions = localStorage.getItem('pnle_revisions');
    if (cachedRevisions) {
      try {
        setRevisionRequests(JSON.parse(cachedRevisions));
      } catch (e) {
        console.error("Error loading cached revisions:", e);
      }
    }
  }, []);

  const handleToggleTheme = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    document.documentElement.classList.toggle('dark', nextDark);
  };

  const saveQuestions = async (newQuestions: Question[]) => {
    const previousQuestions = questions;
    setQuestions(newQuestions);

    try {
      const savedQuestions = await saveSharedQuestions(newQuestions);
      setQuestions(savedQuestions);
      setQuestionBankError('');
      return true;
    } catch (e) {
      console.error("Error saving shared questions:", e);
      setQuestions(previousQuestions);
      setQuestionBankError('The shared question bank could not save this change. Please check the Vercel Blob setup and try again.');
      alert("Unable to save the shared question bank. Please check the Vercel Blob setup and try again.");
      return false;
    }
  };

  const handleUserChange = async (user: User | null) => {
    setCurrentUser(user);
    setScoreSyncError('');

    if (!user) {
      setHistory([]);
      setRankingStats(null);
      setAnsweredQuestionIds([]);
      if (activeTab === 'bank' || activeTab === 'upload' || activeTab === 'users') {
        setActiveTab('dashboard');
      }
      return;
    }

    try {
      if (user.isEnabled || user.isAdmin) {
        const [scoreData, questionProgress] = await Promise.all([
          fetchScores(),
          fetchQuestionProgress(),
        ]);
        setHistory(scoreData.scores);
        setRankingStats(scoreData.ranking);
        setAnsweredQuestionIds(questionProgress);
      } else {
        setHistory([]);
        setRankingStats(null);
        setAnsweredQuestionIds([]);
      }
    } catch (e) {
      console.error("Error loading scores:", e);
      setHistory([]);
      setRankingStats(null);
      setAnsweredQuestionIds([]);
      setScoreSyncError('Could not load score history for this account.');
    }
  };

  const canAccessQuestions = Boolean(currentUser?.isEnabled || currentUser?.isAdmin);

  const saveRevisions = (newRevisions: RevisionRequest[]) => {
    setRevisionRequests(newRevisions);
    localStorage.setItem('pnle_revisions', JSON.stringify(newRevisions));
  };

  // CRUD actions
  const handleQuestionsImported = async (imported: Question[]) => {
    const existingFingerprints = new Set(questions.map(getQuestionFingerprint));
    const uniqueImported: Question[] = [];

    imported.forEach((question) => {
      const fingerprint = getQuestionFingerprint(question);
      if (existingFingerprints.has(fingerprint)) {
        return;
      }

      existingFingerprints.add(fingerprint);
      uniqueImported.push(question);
    });

    if (uniqueImported.length === 0) {
      alert("No new questions were imported because every valid row already exists in the question bank.");
      return;
    }

    const merged = [...questions, ...uniqueImported];
    const didSave = await saveQuestions(merged);
    if (didSave) {
      const skippedCount = imported.length - uniqueImported.length;
      alert(`Successfully imported ${uniqueImported.length} new questions.${skippedCount > 0 ? ` Skipped ${skippedCount} duplicate${skippedCount === 1 ? '' : 's'}.` : ''}`);
      setActiveTab('bank');
    }
  };

  const handleAddQuestion = async (q: Question) => {
    const updated = [q, ...questions];
    await saveQuestions(updated);
  };

  const handleEditQuestion = async (q: Question) => {
    const updated = questions.map(item => item.id === q.id ? q : item);
    await saveQuestions(updated);
  };

  const handleDeleteQuestion = async (id: string) => {
    const updated = questions.filter(item => item.id !== id);
    const didSave = await saveQuestions(updated);

    if (!didSave) {
      return;
    }

    // Auto clear revisions associated with deleted question
    const updatedRevs = revisionRequests.filter(r => r.questionId !== id);
    saveRevisions(updatedRevs);
  };

  const handleClearBank = async () => {
    const didSave = await saveQuestions([]);
    if (didSave) {
      saveRevisions([]); // Clear reports too
    }
  };

  // Reset Progress Handlers
  const handleClearHistory = async () => {
    if (!currentUser) {
      alert("Please sign in to manage score history.");
      return;
    }

    try {
      const scoreData = await clearScores();
      setHistory(scoreData.scores);
      setRankingStats(scoreData.ranking);
      setScoreSyncError('');
      alert("All exam history logs, average scores, and practice metrics have been cleared successfully.");
    } catch (e) {
      console.error("Error clearing scores:", e);
      setScoreSyncError('Could not clear score history. Please try again.');
      alert("Could not clear score history. Please try again.");
    }
  };

  const handleResetAnsweredQuestions = async (category: string) => {
    if (!currentUser) {
      alert("Please sign in to manage question progress.");
      return;
    }

    const questionIds = questions
      .filter((question) => category === 'all' || (question.category || 'General Nursing Practice') === category)
      .map((question) => question.id);

    if (questionIds.length === 0) {
      alert("No questions were found for this subject.");
      return;
    }

    try {
      const nextAnsweredIds = await resetAnsweredQuestions(questionIds);
      setAnsweredQuestionIds(nextAnsweredIds);
      alert("Question repeat tracking was reset for this subject.");
    } catch (e) {
      console.error("Error resetting question progress:", e);
      setScoreSyncError('Could not reset answered-question tracking. Please try again.');
      alert("Could not reset answered-question tracking. Please try again.");
    }
  };

  // Revision Requests handlers
  const handleSubmitRevision = (req: RevisionRequest) => {
    const updated = [req, ...revisionRequests];
    saveRevisions(updated);
    alert("Revision request submitted successfully! An administrator will review your feedback.");
  };

  const handleDismissRevision = (id: string) => {
    const updated = revisionRequests.filter(r => r.id !== id);
    saveRevisions(updated);
  };

  // Quiz submission callback
  const handleQuizSubmitted = async (session: QuizSession) => {
    const scorePct = Math.round((session.score! / session.questions.length) * 100);
    const elapsedSeconds = Math.round((session.endTime! - session.startTime) / 1000);

    const historyItem: ExamHistoryItem = {
      id: `history-${Date.now()}`,
      date: new Date().toISOString(),
      categoryName: session.config.category,
      questionCount: session.questions.length,
      correctCount: session.score!,
      scorePercent: scorePct,
      timeSpentSeconds: elapsedSeconds,
      mode: session.config.mode
    };

    if (currentUser) {
      try {
        const scoreData = await saveScore({
          categoryName: historyItem.categoryName,
          questionCount: historyItem.questionCount,
          correctCount: historyItem.correctCount,
          scorePercent: historyItem.scorePercent,
          timeSpentSeconds: historyItem.timeSpentSeconds,
          mode: historyItem.mode
        });
        setHistory(scoreData.scores);
        setRankingStats(scoreData.ranking);
        setScoreSyncError('');

        try {
          const nextAnsweredIds = await markAnsweredQuestions(session.questions.map((item) => item.question.id));
          setAnsweredQuestionIds(nextAnsweredIds);
        } catch (progressError) {
          console.error("Error saving question progress:", progressError);
          setScoreSyncError('Score saved, but answered-question tracking could not update.');
        }
      } catch (e) {
        console.error("Error saving score:", e);
        setHistory([historyItem, ...history]);
        setScoreSyncError('This score was shown locally but could not be saved to your account.');
      }
    } else {
      setHistory([historyItem]);
      setScoreSyncError('Sign in or create an account before your next exam to save score history.');
    }

    setCompletedSession(session);
    setActiveTab('results');
  };

  return (
    <div className="flex flex-col" style={{ minHeight: '100vh' }}>

      {/* Top navbar */}
      <nav className="navbar">
        <div className="container nav-container">
          <div className="nav-logo" onClick={() => setActiveTab('dashboard')}>
            🩺 <span>PNLE</span>Toni Hub
          </div>

          <div className="nav-links">
            <button
              className={`nav-button ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </button>

            {/* Admin only views */}
            {canManageQuestions && (
              <>
                <button
                  className={`nav-button ${activeTab === 'bank' ? 'active' : ''}`}
                  onClick={() => setActiveTab('bank')}
                >
                  <BookOpen size={16} />
                  <span>Question Bank</span>
                </button>
                <button
                  className={`nav-button ${activeTab === 'upload' ? 'active' : ''}`}
                  onClick={() => setActiveTab('upload')}
                >
                  <FileSpreadsheet size={16} />
                  <span>Import Excel</span>
                </button>
              </>
            )}

            {currentUser?.isAdmin && (
              <button
                className={`nav-button ${activeTab === 'users' ? 'active' : ''}`}
                onClick={() => setActiveTab('users')}
              >
                <Users size={16} />
                <span>Users</span>
              </button>
            )}

            <button
              className={`nav-button ${activeTab === 'quiz' || activeTab === 'results' ? 'active' : ''}`}
              onClick={() => setActiveTab('quiz')}
            >
              <Play size={16} />
              <span>Simulator</span>
            </button>

            {isAccountLoading ? (
              <span className="nav-button" style={{ cursor: 'default' }}>
                <span>Loading Account</span>
              </span>
            ) : (
              <AccountPanel
                user={currentUser}
                history={history}
                ranking={rankingStats}
                questions={questions}
                answeredQuestionIds={answeredQuestionIds}
                onResetAnsweredQuestions={handleResetAnsweredQuestions}
                onUserChange={handleUserChange}
              />
            )}

            <button
              className="theme-toggle"
              onClick={handleToggleTheme}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Main body container */}
      <main style={{ flex: 1, padding: '32px 0' }}>
        <div className="container">
          {isQuestionBankLoading && (
            <div className="card" style={{ marginBottom: '16px', padding: '16px' }}>
              Loading shared question bank...
            </div>
          )}

          {questionBankError && (
            <div className="card" style={{ marginBottom: '16px', padding: '16px', borderColor: 'var(--danger)', color: 'var(--danger)' }}>
              {questionBankError}
            </div>
          )}

          {scoreSyncError && (
            <div className="card" style={{ marginBottom: '16px', padding: '16px', borderColor: 'var(--warning)', color: 'var(--warning)' }}>
              {scoreSyncError}
            </div>
          )}

          {activeTab === 'dashboard' && (
            <Dashboard
              questions={canAccessQuestions ? questions : []}
              history={history}
              user={currentUser}
              canManageQuestions={canManageQuestions}
              onNavigate={(tab) => {
                if (tab === 'quiz') setActiveTab('quiz');
                else if (tab === 'upload') setActiveTab('upload');
                else if (tab === 'bank') setActiveTab('bank');
              }}
              onClearHistory={handleClearHistory}
            />
          )}

          {activeTab === 'bank' && canManageQuestions && (
            <TestBankManager
              questions={questions}
              revisionRequests={revisionRequests}
              onAddQuestion={handleAddQuestion}
              onEditQuestion={handleEditQuestion}
              onDeleteQuestion={handleDeleteQuestion}
              onClearBank={handleClearBank}
              onDismissRevision={handleDismissRevision}
            />
          )}

          {activeTab === 'upload' && canManageQuestions && (
            <ExcelUpload existingQuestions={questions} onQuestionsImported={handleQuestionsImported} />
          )}

          {activeTab === 'users' && currentUser?.isAdmin && (
            <AdminUsersPanel currentUser={currentUser} />
          )}

          {activeTab === 'quiz' && (
            canAccessQuestions ? (
              <ExamSimulator
                questions={questions}
                answeredQuestionIds={answeredQuestionIds}
                onQuizSubmitted={handleQuizSubmitted}
                onSubmitRevision={handleSubmitRevision}
              />
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
                <Lock size={48} style={{ color: 'var(--warning)', margin: '0 auto 16px' }} />
                <h3>Account Approval Required</h3>
                <p style={{ color: 'var(--text-secondary)', marginTop: '8px', maxWidth: '560px', marginInline: 'auto' }}>
                  Please sign in and wait for an admin to enable your account before opening the simulator or question bank.
                </p>
              </div>
            )
          )}

          {activeTab === 'results' && completedSession && (
            <ExamResults
              session={completedSession}
              onBackToDashboard={() => setActiveTab('dashboard')}
              onRestartQuiz={() => setActiveTab('quiz')}
              onSubmitRevision={handleSubmitRevision}
            />
          )}

        </div>
      </main>

      {/* Love Dedication Footer */}
      <footer className="love-footer">
        <div className="container">
          <div className="love-footer-inner">
            <div className="love-footer-hearts">👷 ❤️ 🩺</div>
            <p className="love-footer-message">
              Made with love by <em>Carlo</em>, for <em>Toni</em> — my future RN 🎓
            </p>
            <p className="love-footer-sub">
              Believing in you every step of the way. You've got this! 💪
            </p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              © {new Date().getFullYear()} PNLE Toni Hub
            </p>
          </div>
        </div>
      </footer>


    </div>
  );
}
