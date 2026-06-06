import { useState } from 'react';
import { BookOpen, FileSpreadsheet, Play, Activity, CheckSquare, BarChart, Calendar, Award, AlertCircle } from 'lucide-react';
import { Question, ExamHistoryItem } from '../types';

interface DashboardProps {
  questions: Question[];
  history: ExamHistoryItem[];
  isAdminMode: boolean;
  onNavigate: (tab: 'dashboard' | 'bank' | 'upload' | 'quiz') => void;
  onClearHistory: () => void;
}

export default function Dashboard({ questions, history, isAdminMode, onNavigate, onClearHistory }: DashboardProps) {
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  
  // Stats calculations
  const totalQuestions = questions.length;
  
  const categories = Array.from(new Set(questions.map(q => q.category || 'General Nursing Practice')));
  const activeCategoriesCount = categories.length;

  const examsTaken = history.length;
  
  const avgScore = examsTaken > 0
    ? Math.round(history.reduce((sum, item) => sum + item.scorePercent, 0) / examsTaken)
    : 0;

  // Group questions count by category
  const categoryCounts: { [cat: string]: number } = {};
  questions.forEach(q => {
    const cat = q.category || 'General Nursing Practice';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  // Formatting date helper
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Welcome Banner */}
      <div 
        className="card" 
        style={{ 
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
          color: '#ffffff',
          border: 'none',
          padding: '32px'
        }}
      >
        <h1 style={{ fontSize: '2.25rem', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>
          PNLE Board Examination Portal
        </h1>
        <p style={{ fontSize: '1.05rem', opacity: 0.9, maxWidth: '600px', lineHeight: '1.6' }}>
          Upload your review questionnaires, configure custom subject trials, and master clinical nursing rationales to secure your nursing license (RN).
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid dashboard-stats">
        <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className="icon-container" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <BookOpen size={24} />
          </div>
          <div>
            <div className="stat-desc">Test Bank Questions</div>
            <div className="stat-value">{totalQuestions}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {activeCategoriesCount} Active Subject Areas
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className="icon-container" style={{ background: 'var(--info-light)', color: 'var(--info)' }}>
            <Activity size={24} />
          </div>
          <div>
            <div className="stat-desc">Practice Exams Taken</div>
            <div className="stat-value">{examsTaken}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Simulated Trial History
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className="icon-container" style={{ 
            background: avgScore >= 75 ? 'var(--success-light)' : 'var(--danger-light)', 
            color: avgScore >= 75 ? 'var(--success)' : 'var(--danger)' 
          }}>
            <Award size={24} />
          </div>
          <div>
            <div className="stat-desc">Average Performance</div>
            <div className="stat-value" style={{ color: avgScore >= 75 ? 'var(--success)' : 'var(--text-primary)' }}>
              {avgScore}%
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Board Standard: 75%
            </div>
          </div>
        </div>
      </div>

      {/* Primary Actions Card */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', fontFamily: 'var(--font-heading)' }}>
          Quick Review Actions
        </h3>
        <div className="grid" style={{ 
          gridTemplateColumns: isAdminMode ? 'repeat(auto-fit, minmax(220px, 1fr))' : '1fr', 
          gap: '16px' 
        }}>
          <button className="btn btn-primary" onClick={() => onNavigate('quiz')} style={{ padding: '16px', height: '100%' }}>
            <Play size={18} />
            Launch Exam Simulator
          </button>
          
          {isAdminMode && (
            <>
              <button className="btn btn-secondary" onClick={() => onNavigate('upload')} style={{ padding: '16px', height: '100%' }}>
                <FileSpreadsheet size={18} style={{ color: 'var(--primary)' }} />
                Import Excel Questionnaire
              </button>

              <button className="btn btn-secondary" onClick={() => onNavigate('bank')} style={{ padding: '16px', height: '100%' }}>
                <CheckSquare size={18} style={{ color: 'var(--info)' }} />
                Explore Question Bank
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sub-Panels (Category tallies vs History) */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginTop: '8px' }}>
        
        {/* Category breakdown */}
        <div className="card">
          <h3 className="card-title">
            <BarChart style={{ color: 'var(--primary)' }} />
            Question Breakdown by Subject
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '16px' }}>
            Current questionnaire count indexed in your local browser cache.
          </p>
          
          {totalQuestions === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '24px' }}>
              Import questionnaire files to view subject distributions.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {Object.entries(categoryCounts).map(([cat, count]) => {
                const percentage = Math.round((count / totalQuestions) * 100);
                return (
                  <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div className="flex justify-between" style={{ fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600 }}>{cat}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{count} questions ({percentage}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)' }}>
                      <div style={{ width: `${percentage}%`, height: '100%', background: 'var(--primary)', borderRadius: 'var(--radius-full)' }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* History Log */}
        <div className="card">
          <div className="flex justify-between align-center" style={{ marginBottom: '16px' }}>
            <h3 className="card-title" style={{ margin: 0 }}>
              <Calendar style={{ color: 'var(--info)' }} />
              Recent Session Results
            </h3>
            {examsTaken > 0 && (
              <button 
                className="btn btn-secondary" 
                style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={() => setIsResetConfirmOpen(true)}
              >
                Reset Progress
              </button>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '16px' }}>
            List of completed practice tests and scores.
          </p>

          {examsTaken === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '24px' }}>
              No sessions recorded. Start a trial to see your performance log.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '320px', overflowY: 'auto' }}>
              {[...history].reverse().slice(0, 5).map((item) => {
                const passed = item.scorePercent >= 75;
                return (
                  <div 
                    key={item.id} 
                    style={{ 
                      padding: '12px', 
                      background: 'var(--bg-primary)', 
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '240px' }}>
                      <strong style={{ fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.categoryName}>
                        {item.categoryName === 'all' ? 'All Subjects' : item.categoryName}
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {formatDate(item.date)} • {item.questionCount} Qs ({item.mode === 'qna' ? 'Practice' : 'Exam'})
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <strong style={{ fontSize: '1rem', color: passed ? 'var(--success)' : 'var(--danger)' }}>
                        {item.scorePercent}%
                      </strong>
                      <span className={`badge ${passed ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                        {passed ? 'Passed' : 'Failed'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Reset Progress Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px', textAlign: 'center' }}>
            <AlertCircle size={48} style={{ color: 'var(--danger)', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-heading)' }}>Clear All Practice History?</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Are you sure you want to permanently clear all your past exam attempts, average performance analytics, and practice history? This action cannot be undone and will not affect your stored Question Bank.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => setIsResetConfirmOpen(false)}>
                No, Keep History
              </button>
              <button 
                className="btn btn-danger" 
                onClick={() => {
                  onClearHistory();
                  setIsResetConfirmOpen(false);
                }}
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
