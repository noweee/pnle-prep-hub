import { useState } from 'react';
import { Search, Plus, Trash2, Edit, FileJson, ChevronDown, ChevronUp, X, Check, HelpCircle } from 'lucide-react';
import { Question, RevisionRequest } from '../types';

interface TestBankManagerProps {
  questions: Question[];
  revisionRequests: RevisionRequest[];
  onAddQuestion: (q: Question) => void;
  onEditQuestion: (q: Question) => void;
  onDeleteQuestion: (id: string) => void;
  onClearBank: () => void;
  onDismissRevision: (id: string) => void;
}

export default function TestBankManager({
  questions,
  revisionRequests,
  onAddQuestion,
  onEditQuestion,
  onDeleteQuestion,
  onClearBank,
  onDismissRevision
}: TestBankManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'revisions'>('catalog');
  
  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Form states
  const [formQuestion, setFormQuestion] = useState('');
  const [formA, setFormA] = useState('');
  const [formB, setFormB] = useState('');
  const [formC, setFormC] = useState('');
  const [formD, setFormD] = useState('');
  const [formAnswer, setFormAnswer] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [formRationale, setFormRationale] = useState('');
  const [formCategory, setFormCategory] = useState('');

  // Extract all categories in the database
  const categories = ['all', ...Array.from(new Set(questions.map(q => q.category || 'General Nursing Practice')))];

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleOpenAdd = () => {
    setFormQuestion('');
    setFormA('');
    setFormB('');
    setFormC('');
    setFormD('');
    setFormAnswer('A');
    setFormRationale('');
    setFormCategory('NP I: Foundation of Professional Nursing Practice');
    setIsAddOpen(true);
  };

  const handleOpenEdit = (q: Question, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent toggling expand
    setEditingQuestion(q);
    setFormQuestion(q.questionText);
    setFormA(q.optionA);
    setFormB(q.optionB);
    setFormC(q.optionC);
    setFormD(q.optionD);
    setFormAnswer(q.correctAnswer);
    setFormRationale(q.rationale || '');
    setFormCategory(q.category || 'General Nursing Practice');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formQuestion || !formA || !formB || !formC || !formD) {
      alert("Please fill in the question and all four choices.");
      return;
    }

    if (editingQuestion) {
      // Save Edit
      onEditQuestion({
        ...editingQuestion,
        questionText: formQuestion,
        optionA: formA,
        optionB: formB,
        optionC: formC,
        optionD: formD,
        correctAnswer: formAnswer,
        rationale: formRationale,
        category: formCategory
      });
      setEditingQuestion(null);
    } else {
      // Save Add
      onAddQuestion({
        id: `manual-${Date.now()}`,
        questionText: formQuestion,
        optionA: formA,
        optionB: formB,
        optionC: formC,
        optionD: formD,
        correctAnswer: formAnswer,
        rationale: formRationale,
        category: formCategory
      });
      setIsAddOpen(false);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this question?")) {
      onDeleteQuestion(id);
    }
  };

  const handleExport = () => {
    if (questions.length === 0) {
      alert("No questions to export.");
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(questions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `pnle_test_bank_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleClearAll = () => {
    if (confirm("WARNING: This will permanently delete ALL questions in your test bank. Are you sure you want to proceed?")) {
      onClearBank();
    }
  };

  // Filtering questions
  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.questionText.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (q.rationale && q.rationale.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const cat = q.category || 'General Nursing Practice';
    const matchesCategory = selectedCategory === 'all' || cat === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between align-center">
        <div>
          <h2 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-heading)' }}>Question Bank Explorer</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Search, edit, review, and organize your {questions.length} total questions.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={handleExport}>
            <FileJson size={18} />
            Export JSON
          </button>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={18} />
            Add Question
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }}>
              <Search size={18} />
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search by keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '40px', width: '100%' }}
            />
          </div>

          <div style={{ width: '280px', minWidth: '200px' }}>
            <select
              className="form-control"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ width: '100%', cursor: 'pointer' }}
            >
              <option value="all">All Subjects</option>
              {categories.filter(c => c !== 'all').map((cat, idx) => (
                <option key={idx} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {questions.length > 0 && (
            <button className="btn btn-danger" onClick={handleClearAll} style={{ padding: '10px 16px' }}>
              <Trash2 size={16} />
              Clear Bank
            </button>
          )}
        </div>
      </div>

      {/* Sub-tabs header */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginTop: '12px' }}>
        <button
          className={`btn ${activeSubTab === 'catalog' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '6px 16px', fontSize: '0.85rem' }}
          onClick={() => setActiveSubTab('catalog')}
        >
          Catalog Explorer ({questions.length})
        </button>
        <button
          className={`btn ${activeSubTab === 'revisions' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '6px 16px', fontSize: '0.85rem', position: 'relative' }}
          onClick={() => setActiveSubTab('revisions')}
        >
          Revision Requests
          {revisionRequests.length > 0 && (
            <span 
              style={{ 
                background: 'var(--danger)', 
                color: '#ffffff', 
                fontSize: '0.7rem', 
                padding: '2px 6px', 
                borderRadius: '9999px',
                marginLeft: '6px'
              }}
            >
              {revisionRequests.length}
            </span>
          )}
        </button>
      </div>

      {activeSubTab === 'catalog' && (
        <div className="flex flex-col gap-2" style={{ marginTop: '8px' }}>
          {filteredQuestions.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px', background: 'transparent' }}>
              <HelpCircle size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
              <h3 style={{ color: 'var(--text-secondary)' }}>No questions match your filters</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
                {questions.length === 0 
                  ? 'Your test bank is empty. Head to the "Import" tab to upload questions via Excel.' 
                  : 'Try adjusting your search term or select another category.'}
              </p>
            </div>
          ) : (
            filteredQuestions.map((q, index) => {
              const isExpanded = expandedId === q.id;
              return (
                <div key={q.id} style={{ display: 'flex', flexDirection: 'column' }}>
                  <div 
                    className="accordion-header"
                    onClick={() => toggleExpand(q.id)}
                    style={{ 
                      borderBottomLeftRadius: isExpanded ? '0' : 'var(--radius-sm)', 
                      borderBottomRightRadius: isExpanded ? '0' : 'var(--radius-sm)',
                      boxShadow: isExpanded ? 'none' : 'var(--shadow-sm)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1, paddingRight: '16px' }}>
                      <span className="badge badge-primary" style={{ marginTop: '2px', flexShrink: 0 }}>
                        Q {index + 1}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.975rem', lineHeight: '1.4' }}>
                          {q.questionText}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {q.category || 'General Nursing Practice'}
                        </span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <button 
                        className="theme-toggle" 
                        onClick={(e) => handleOpenEdit(q, e)}
                        title="Edit Question"
                        style={{ width: '32px', height: '32px' }}
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        className="theme-toggle" 
                        onClick={(e) => handleDelete(q.id, e)}
                        title="Delete Question"
                        style={{ width: '32px', height: '32px', color: 'var(--danger)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                      <div style={{ color: 'var(--text-muted)', marginLeft: '8px', display: 'flex', alignItems: 'center' }}>
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="accordion-content">
                      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                        <div className={`choice-btn ${q.correctAnswer === 'A' ? 'correct' : ''}`} style={{ cursor: 'default', margin: 0 }}>
                          <span className="choice-letter">A</span>
                          <span>{q.optionA}</span>
                        </div>
                        <div className={`choice-btn ${q.correctAnswer === 'B' ? 'correct' : ''}`} style={{ cursor: 'default', margin: 0 }}>
                          <span className="choice-letter">B</span>
                          <span>{q.optionB}</span>
                        </div>
                        <div className={`choice-btn ${q.correctAnswer === 'C' ? 'correct' : ''}`} style={{ cursor: 'default', margin: 0 }}>
                          <span className="choice-letter">C</span>
                          <span>{q.optionC}</span>
                        </div>
                        <div className={`choice-btn ${q.correctAnswer === 'D' ? 'correct' : ''}`} style={{ cursor: 'default', margin: 0 }}>
                          <span className="choice-letter">D</span>
                          <span>{q.optionD}</span>
                        </div>
                      </div>
                      {q.rationale && (
                        <div className="rationale-container" style={{ marginTop: '16px' }}>
                          <div className="rationale-title">
                            <Check size={16} />
                            Correct Answer: {q.correctAnswer} — Nursing Rationale
                          </div>
                          <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                            {q.rationale}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {activeSubTab === 'revisions' && (
        <div className="flex flex-col gap-2" style={{ marginTop: '8px' }}>
          {revisionRequests.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px', background: 'transparent' }}>
              <Check size={48} style={{ color: 'var(--success)', margin: '0 auto 16px' }} />
              <h3>All Clear!</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                There are no pending question revision requests.
              </p>
            </div>
          ) : (
            revisionRequests.map((req) => {
              const matchedQ = questions.find(q => q.id === req.questionId);
              return (
                <div key={req.id} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="flex justify-between align-center" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>Reported on {new Date(req.date).toLocaleDateString()}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {matchedQ ? (
                        <button
                          className="btn btn-primary"
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          onClick={(e) => {
                            handleOpenEdit(matchedQ, e);
                          }}
                        >
                          Edit Question
                        </button>
                      ) : (
                        <span className="badge badge-danger">Question Deleted</span>
                      )}
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                        onClick={() => onDismissRevision(req.id)}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '2px' }}>
                      Question stem
                    </span>
                    <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                      {req.questionText}
                    </p>
                  </div>

                  <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    <div style={{ background: 'var(--danger-light)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                        REPORTED ISSUE
                      </span>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{req.issueDescription}</p>
                    </div>

                    <div style={{ background: 'var(--success-light)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                        SUGGESTED CORRECTION
                      </span>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{req.suggestedFix || 'None provided.'}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Add / Edit Modal Overlay */}
      {(isAddOpen || editingQuestion) && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-heading)' }}>
                {editingQuestion ? 'Edit Question' : 'Add New Question'}
              </h3>
              <button className="modal-close" onClick={() => { setIsAddOpen(false); setEditingQuestion(null); }}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Category / Subject Area</label>
                <select 
                  className="form-control"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                >
                  <option value="NP I: Foundation of Professional Nursing Practice">NP I: Foundation of Professional Nursing Practice</option>
                  <option value="NP II: Community Health Nursing and Care of the Mother and Child">NP II: Community Health Nursing and Care of the Mother and Child</option>
                  <option value="NP III: Care of Clients with Physiologic and Psychosocial Alterations (Part A)">NP III: Care of Clients with Physiologic and Psychosocial Alterations (Part A)</option>
                  <option value="NP IV: Care of Clients with Physiologic and Psychosocial Alterations (Part B)">NP IV: Care of Clients with Physiologic and Psychosocial Alterations (Part B)</option>
                  <option value="NP V: Care of Clients with Physiologic and Psychosocial Alterations (Part C)">NP V: Care of Clients with Physiologic and Psychosocial Alterations (Part C)</option>
                  <option value="General Nursing Practice">General Nursing Practice</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Question Text</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={formQuestion}
                  onChange={(e) => setFormQuestion(e.target.value)}
                  placeholder="Enter the question stem..."
                  required
                />
              </div>

              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Choice A</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formA}
                    onChange={(e) => setFormA(e.target.value)}
                    placeholder="Option A content"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Choice B</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formB}
                    onChange={(e) => setFormB(e.target.value)}
                    placeholder="Option B content"
                    required
                  />
                </div>
              </div>

              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Choice C</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formC}
                    onChange={(e) => setFormC(e.target.value)}
                    placeholder="Option C content"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Choice D</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formD}
                    onChange={(e) => setFormD(e.target.value)}
                    placeholder="Option D content"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Correct Answer Key</label>
                <select
                  className="form-control"
                  value={formAnswer}
                  onChange={(e) => setFormAnswer(e.target.value as 'A' | 'B' | 'C' | 'D')}
                >
                  <option value="A">Choice A</option>
                  <option value="B">Choice B</option>
                  <option value="C">Choice C</option>
                  <option value="D">Choice D</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Nursing Rationale / Explanation</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={formRationale}
                  onChange={(e) => setFormRationale(e.target.value)}
                  placeholder="Explain why this choice is correct and others are incorrect..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setIsAddOpen(false); setEditingQuestion(null); }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingQuestion ? 'Save Changes' : 'Create Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
