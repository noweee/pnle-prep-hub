import { useState, useEffect } from 'react';
import { BookOpen, FileSpreadsheet, Play, LayoutDashboard, Sun, Moon, Lock, Unlock, X } from 'lucide-react';
import { Question, ExamHistoryItem, QuizSession, RevisionRequest } from './types';

// Importing components
import Dashboard from './components/Dashboard';
import ExcelUpload from './components/ExcelUpload';
import TestBankManager from './components/TestBankManager';
import ExamSimulator from './components/ExamSimulator';
import ExamResults from './components/ExamResults';
import { fetchSharedQuestions, saveSharedQuestions } from './lib/questionBankApi';

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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bank' | 'upload' | 'quiz' | 'results'>('dashboard');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isQuestionBankLoading, setIsQuestionBankLoading] = useState(true);
  const [questionBankError, setQuestionBankError] = useState('');
  const [history, setHistory] = useState<ExamHistoryItem[]>([]);
  const [revisionRequests, setRevisionRequests] = useState<RevisionRequest[]>([]);
  const [completedSession, setCompletedSession] = useState<QuizSession | null>(null);

  // Admin Privileges
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isPasscodeOpen, setIsPasscodeOpen] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

  // Theme state
  const [darkMode, setDarkMode] = useState(true);

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

    // Load history
    const cachedHistory = localStorage.getItem('pnle_history');
    if (cachedHistory) {
      try {
        setHistory(JSON.parse(cachedHistory));
      } catch (e) {
        console.error("Error loading cached history:", e);
      }
    }

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

  const saveHistory = (newHistory: ExamHistoryItem[]) => {
    setHistory(newHistory);
    localStorage.setItem('pnle_history', JSON.stringify(newHistory));
  };

  const saveRevisions = (newRevisions: RevisionRequest[]) => {
    setRevisionRequests(newRevisions);
    localStorage.setItem('pnle_revisions', JSON.stringify(newRevisions));
  };

  // CRUD actions
  const handleQuestionsImported = async (imported: Question[]) => {
    const merged = [...questions, ...imported];
    const didSave = await saveQuestions(merged);
    if (didSave) {
      alert(`Successfully imported ${imported.length} new questions!`);
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
  const handleClearHistory = () => {
    saveHistory([]);
    alert("All exam history logs, average scores, and practice metrics have been cleared successfully.");
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

  // Passcode verification
  const handleVerifyPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcodeInput === '7324514321') {
      setIsAdminMode(true);
      setIsPasscodeOpen(false);
      setPasscodeInput('');
      setPasscodeError('');
      alert("Admin Mode unlocked. Access to Question Bank and Imports granted.");
    } else {
      setPasscodeError("Invalid passcode. Please try again.");
    }
  };

  const handleLockAdmin = () => {
    setIsAdminMode(false);
    if (activeTab === 'bank' || activeTab === 'upload') {
      setActiveTab('dashboard');
    }
    alert("Admin privileges locked.");
  };

  // Quiz submission callback
  const handleQuizSubmitted = (session: QuizSession) => {
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

    saveHistory([...history, historyItem]);
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
            {isAdminMode && (
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

            <button
              className={`nav-button ${activeTab === 'quiz' || activeTab === 'results' ? 'active' : ''}`}
              onClick={() => setActiveTab('quiz')}
            >
              <Play size={16} />
              <span>Simulator</span>
            </button>

            {/* Admin toggle lock */}
            {isAdminMode ? (
              <button className="nav-button" onClick={handleLockAdmin} style={{ color: 'var(--success)' }}>
                <Unlock size={16} />
                <span>Admin Unlocked</span>
              </button>
            ) : (
              <button className="nav-button" onClick={() => setIsPasscodeOpen(true)}>
                <Lock size={16} />
                <span>Admin Login</span>
              </button>
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

          {activeTab === 'dashboard' && (
            <Dashboard
              questions={questions}
              history={history}
              isAdminMode={isAdminMode}
              onNavigate={(tab) => {
                if (tab === 'quiz') setActiveTab('quiz');
                else if (tab === 'upload') setActiveTab('upload');
                else if (tab === 'bank') setActiveTab('bank');
              }}
              onClearHistory={handleClearHistory}
            />
          )}

          {activeTab === 'bank' && isAdminMode && (
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

          {activeTab === 'upload' && isAdminMode && (
            <ExcelUpload onQuestionsImported={handleQuestionsImported} />
          )}

          {activeTab === 'quiz' && (
            <ExamSimulator
              questions={questions}
              onQuizSubmitted={handleQuizSubmitted}
              onSubmitRevision={handleSubmitRevision}
            />
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

      {/* Admin Passcode Modal */}
      {isPasscodeOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem' }}>
                <Lock size={18} style={{ color: 'var(--primary)' }} />
                Admin Authentication
              </h3>
              <button className="modal-close" onClick={() => { setIsPasscodeOpen(false); setPasscodeInput(''); setPasscodeError(''); }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleVerifyPasscode}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Enter Passcode to Unlock Panel</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Enter admin passcode"
                  value={passcodeInput}
                  onChange={(e) => setPasscodeInput(e.target.value)}
                  autoFocus
                  required
                />
                {passcodeError && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--danger)', marginTop: '4px', display: 'block' }}>
                    {passcodeError}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setIsPasscodeOpen(false); setPasscodeInput(''); setPasscodeError(''); }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
