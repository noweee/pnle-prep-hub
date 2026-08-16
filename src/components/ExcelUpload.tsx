import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileText, Download, CheckCircle, AlertTriangle, PlusCircle } from 'lucide-react';
import { Question } from '../types';
import { getParsedQuestionFingerprint, getQuestionFingerprint } from '../lib/questionFingerprint';

interface ExcelUploadProps {
  existingQuestions: Question[];
  onQuestionsImported: (questions: Question[]) => Promise<boolean>;
}

interface ParsedRow {
  rowNum: number;
  question: string;
  optA: string;
  optB: string;
  optC: string;
  optD: string;
  answer: string;
  rationale: string;
  category: string;
  situationText: string;
  sourceExam: string;
  warnings: string[];
  isValid: boolean;
  duplicateReason: string;
}

export default function ExcelUpload({ existingQuestions, onQuestionsImported }: ExcelUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [questionnaireSource, setQuestionnaireSource] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  // Helper to map headers case-insensitively
  const findValue = (row: any, keys: string[]) => {
    const matchKey = Object.keys(row).find(k =>
      keys.some(key => k.toLowerCase().replace(/[\s_-]/g, '') === key.toLowerCase().replace(/[\s_-]/g, ''))
    );
    return matchKey ? String(row[matchKey]).trim() : '';
  };

  const makeSituationId = (category: string, situationText: string) => {
    if (!situationText.trim()) return '';

    const source = `${category} ${situationText}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return `situation-${source.slice(0, 80)}`;
  };

  const sortQuestions = (items: Question[]) => {
    return [...items].sort((a, b) => {
      const categoryCompare = (a.category || '').localeCompare(b.category || '');
      if (categoryCompare !== 0) return categoryCompare;

      const situationCompare = (a.situationText || '').localeCompare(b.situationText || '');
      if (situationCompare !== 0) return situationCompare;

      return a.questionText.localeCompare(b.questionText);
    });
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    setIsParsing(true);
    setParsedRows([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Parse options raw so we can scan headers
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        if (jsonData.length === 0) {
          alert("The Excel sheet seems to be empty.");
          setIsParsing(false);
          return;
        }

        const existingFingerprints = new Set(existingQuestions.map(getQuestionFingerprint));
        const uploadedFingerprints = new Map<string, number>();

        const rows: ParsedRow[] = jsonData.map((row: any, index) => {
          const rowNum = index + 2; // header is row 1
          
          const question = findValue(row, ['question', 'questiontext', 'q', 'item', 'query', 'question_text']);
          const optA = findValue(row, ['optiona', 'choicea', 'a', 'option_a', 'choice_a']);
          const optB = findValue(row, ['optionb', 'choiceb', 'b', 'option_b', 'choice_b']);
          const optC = findValue(row, ['optionc', 'choicec', 'c', 'option_c', 'choice_c']);
          const optD = findValue(row, ['optiond', 'choiced', 'd', 'option_d', 'choice_d']);
          const answer = findValue(row, ['answer', 'correctanswer', 'correct', 'key', 'correctchoice', 'ans', 'correct_answer']);
          const rationale = findValue(row, ['rationale', 'explanation', 'exp', 'reason', 'why']);
          const category = findValue(row, ['category', 'subject', 'practicearea', 'nursingpractice', 'np', 'nursing_practice']);
          const situationText = findValue(row, ['situationtext', 'situation', 'case', 'scenario', 'stemcontext', 'situation_text']);
          const sourceExam = findValue(row, ['sourceexam', 'source', 'examdate', 'boardexam', 'pastboard', 'pastboards', 'questionnairefrom']) || questionnaireSource.trim();

          const warnings: string[] = [];

          if (!question) warnings.push("Missing Question text");
          if (!optA) warnings.push("Missing Choice A");
          if (!optB) warnings.push("Missing Choice B");
          if (!optC) warnings.push("Missing Choice C");
          if (!optD) warnings.push("Missing Choice D");
          
          let cleanedAnswer: 'A' | 'B' | 'C' | 'D' | '' = '';
          if (!answer) {
            warnings.push("Missing Correct Answer key");
          } else {
            const ansStr = answer.toUpperCase().replace(/\s/g, '');
            if (ansStr === 'A' || ansStr === 'B' || ansStr === 'C' || ansStr === 'D') {
              cleanedAnswer = ansStr as 'A' | 'B' | 'C' | 'D';
            } else if (ansStr.includes('A') || ansStr === optA.toUpperCase()) {
              cleanedAnswer = 'A';
            } else if (ansStr.includes('B') || ansStr === optB.toUpperCase()) {
              cleanedAnswer = 'B';
            } else if (ansStr.includes('C') || ansStr === optC.toUpperCase()) {
              cleanedAnswer = 'C';
            } else if (ansStr.includes('D') || ansStr === optD.toUpperCase()) {
              cleanedAnswer = 'D';
            } else {
              warnings.push(`Invalid Correct Answer: "${answer}" (Must map to A, B, C, or D)`);
            }
          }

          const fingerprint = getParsedQuestionFingerprint({
            question,
            optA,
            optB,
            optC,
            optD
          });
          const firstSeenRow = uploadedFingerprints.get(fingerprint);
          let duplicateReason = '';

          if (question && existingFingerprints.has(fingerprint)) {
            duplicateReason = 'Already exists in question bank';
          } else if (question && firstSeenRow !== undefined) {
            duplicateReason = `Duplicate of uploaded row ${firstSeenRow}`;
          }

          if (question && firstSeenRow === undefined) {
            uploadedFingerprints.set(fingerprint, rowNum);
          }

          if (duplicateReason) {
            warnings.push(duplicateReason);
          }

          return {
            rowNum,
            question,
            optA,
            optB,
            optC,
            optD,
            answer: cleanedAnswer,
            rationale,
            category: category || 'General Nursing Practice',
            situationText,
            sourceExam,
            warnings,
            duplicateReason,
            isValid: warnings.length === 0 && !!question && !!optA && !!optB && !!optC && !!optD && !!cleanedAnswer
          };
        });

        setParsedRows(rows);
      } catch (err) {
        console.error("Error parsing excel:", err);
        alert("Failed to parse the file. Please make sure it is a valid Excel or CSV sheet.");
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    const validQuestions: Question[] = sortQuestions(parsedRows
      .filter(row => row.isValid)
      .map((row, idx) => ({
        id: `imported-${Date.now()}-${idx}-${row.rowNum}`,
        questionText: row.question,
        optionA: row.optA,
        optionB: row.optB,
        optionC: row.optC,
        optionD: row.optD,
        correctAnswer: row.answer as 'A' | 'B' | 'C' | 'D',
        rationale: row.rationale,
        category: row.category,
        situationText: row.situationText,
        situationId: makeSituationId(row.category, row.situationText),
        sourceExam: row.sourceExam || questionnaireSource.trim(),
        isPastBoard: Boolean(row.sourceExam || questionnaireSource.trim())
      })));

    if (validQuestions.length === 0) {
      alert("No valid questions found to import. Please check file formatting.");
      return;
    }

    setIsImporting(true);

    try {
      const didImport = await onQuestionsImported(validQuestions);
      if (didImport) {
        setParsedRows([]);
        setFileName('');
        setQuestionnaireSource('');
      }
    } finally {
      setIsImporting(false);
    }
  };

  // Generate and download a sample excel file
  const downloadSampleTemplate = () => {
    const headers = ['Category', 'Situation Text', 'Source Exam', 'Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer', 'Rationale'];
    const sampleData = [
      [
        'NP III: Care of Clients with Physiologic and Psychosocial Alterations',
        'A client is admitted with acute abdominal pain and abnormal pancreatic enzymes.',
        'December 2008 Past Boards',
        'A client is admitted with a diagnosis of acute pancreatitis. Which of the following laboratory values should the nurse expect to be elevated?',
        'Serum calcium',
        'Serum amylase',
        'Blood urea nitrogen',
        'Serum potassium',
        'B',
        'Serum amylase and lipase are digestive enzymes produced by the pancreas. In acute pancreatitis, pancreatic cells are damaged, causing these enzymes to leak into the blood, resulting in elevated levels.'
      ],
      [
        'NP II: Community Health Nursing and Mother-Child Care',
        'The community health nurse plans population-level health promotion activities.',
        'December 2008 Past Boards',
        'Which of the following is the primary responsibility of a community health nurse?',
        'Providing acute bedside care in hospitals',
        'Performing specialized minor surgical procedures',
        'Health promotion, disease prevention, and education in the community',
        'Administering complex chemotherapy treatments in outpatient clinics',
        'C',
        'Community health nursing focuses on population-based health, where the primary emphasis is on promoting wellness and preventing disease through education, immunization, and community-wide safety campaigns.'
      ],
      [
        'NP I: Foundation of Professional Nursing Practice',
        'A faculty member reviews legal qualifications in Philippine nursing education.',
        'December 2008 Past Boards',
        'According to the Philippine Nursing Act of 2002 (RA 9173), what is the minimum educational requirement for a Dean of a College of Nursing?',
        'Bachelor of Science in Nursing',
        'Master of Arts in Nursing (or Master of Science in Nursing)',
        'Doctor of Philosophy in Nursing Education',
        'Master of Science in Public Health Education',
        'B',
        'Republic Act 9173 (Philippine Nursing Law) specifies that a Dean of a College of Nursing in the Philippines must hold a Master\'s degree in nursing (MAN/MSN) and have at least 5 years of teaching experience.'
      ],
      [
        'NP IV: Care of Clients with Physiologic and Psychosocial Alterations',
        'The nurse monitors a client while blood products are infusing.',
        'December 2008 Past Boards',
        'A nurse is caring for a client receiving blood transfusion. The client suddenly develops chills, fever, and low back pain. Which action should the nurse take first?',
        'Slow down the transfusion rate to 50 mL/hour',
        'Administer oral acetaminophen to relieve fever and pain',
        'Stop the transfusion immediately',
        'Notify the attending physician and blood bank clerk',
        'C',
        'Chills, fever, and low back pain indicate a potential acute hemolytic transfusion reaction. The immediate priority is to stop the transfusion to prevent further infusing of incompatible blood, which can cause renal failure.'
      ],
      [
        'NP V: Care of Clients with Physiologic and Psychosocial Alterations',
        'A patient receives antidepressant therapy and needs discharge teaching.',
        'December 2008 Past Boards',
        'A patient with major depressive disorder is prescribed an SSRI. The nurse should instruct the patient to monitor for which critical, life-threatening syndrome?',
        'Serotonin syndrome (agitation, fever, tremors, hyperreflexia)',
        'Hypertensive crisis triggered by tyramine-rich foods (aged cheese)',
        'Neuroleptic malignant syndrome (rigidity, hyperpyrexia)',
        'Agranulocytosis (sudden drop in white blood cell count)',
        'A',
        'SSRI side effects include Serotonin Syndrome, characterized by cognitive alterations (agitation, confusion), autonomic hyperactivity (sweating, fever), and neuromuscular abnormalities (tremors, hyperreflexia).'
      ]
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Questions Template");
    
    // Auto-fit column widths
    const max_cols = headers.length;
    worksheet['!cols'] = Array(max_cols).fill(0).map((_, i) => ({
      wch: i === 0 || i === 6 ? 40 : 25
    }));

    XLSX.writeFile(workbook, "PNLE_Sample_Questions_Template.xlsx");
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;
  const duplicateCount = parsedRows.filter(r => r.duplicateReason).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between align-center">
        <div>
          <h2 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-heading)' }}>Import Questionnaire</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Upload an Excel or CSV file to build your PNLE test bank.</p>
        </div>
        <button className="btn btn-secondary" onClick={downloadSampleTemplate}>
          <Download size={18} />
          Download Sample Excel
        </button>
      </div>

      <div className="card" style={{ padding: '32px' }}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".xlsx, .xls, .csv"
          style={{ display: 'none' }}
        />

        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label className="form-label">Questionnaire Source / Exam Date</label>
          <input
            type="text"
            className="form-control"
            value={questionnaireSource}
            onChange={(event) => setQuestionnaireSource(event.target.value)}
            placeholder="Example: December 2008 Past Boards"
          />
          <span style={{ display: 'block', marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            This label will mark imported items as past-board questions. A Source Exam column in the file can override it per row.
          </span>
        </div>
        
        <div
          className={`upload-dropzone ${dragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="upload-icon">
            <Upload size={32} />
          </div>
          <div>
            <h3 style={{ marginBottom: '4px' }}>
              {isParsing ? 'Processing File...' : 'Drag & Drop your Excel sheet here'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Supports .xlsx, .xls, and .csv formats
            </p>
          </div>
          {fileName && (
            <div className="badge badge-info" style={{ gap: '6px', padding: '6px 12px', fontSize: '0.85rem' }}>
              <FileText size={14} />
              {fileName}
            </div>
          )}
        </div>

        <div className="template-card">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <AlertTriangle size={18} style={{ color: 'var(--primary)' }} />
            Instructions & Expected Headers
          </h4>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
            To guarantee correct parsing, configure your sheet with the headers listed below. The column order does not matter, and row headers are case-insensitive.
          </p>
          <div className="data-table-container">
            <table className="template-table">
              <thead>
                <tr>
                  <th>Header Keyword</th>
                  <th>Description</th>
                  <th>Acceptable Values</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Category</strong></td>
                  <td>Board exam classification / subject</td>
                  <td>e.g., <em>NP I: Foundations</em>, <em>NP III: Medical Surgical</em></td>
                </tr>
                <tr>
                  <td><strong>Situation Text</strong></td>
                  <td>Shared scenario for related questions</td>
                  <td>Optional. Questions with identical situation text are kept together during shuffling.</td>
                </tr>
                <tr>
                  <td><strong>Source Exam</strong></td>
                  <td>Where the questions came from</td>
                  <td>Optional. Example: <em>December 2008 Past Boards</em>. You can also use the upload field above.</td>
                </tr>
                <tr>
                  <td><strong>Question</strong></td>
                  <td>The question stem / question content</td>
                  <td>Any text string describing the question scenario</td>
                </tr>
                <tr>
                  <td><strong>Option A - D</strong></td>
                  <td>Individual choices/options for the question</td>
                  <td>Required. Plain text options</td>
                </tr>
                <tr>
                  <td><strong>Correct Answer</strong></td>
                  <td>The key indicating the correct answer choice</td>
                  <td>Must be <code>A</code>, <code>B</code>, <code>C</code>, or <code>D</code>. Rows without an answer are not imported.</td>
                </tr>
                <tr>
                  <td><strong>Rationale</strong></td>
                  <td>Critical explanation/nursing rationale (optional)</td>
                  <td>Text explaining the physiology, law, or priority basis</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {parsedRows.length > 0 && (
        <div className="card" style={{ marginTop: '16px' }}>
          <div className="flex justify-between align-center" style={{ marginBottom: '16px' }}>
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText style={{ color: 'var(--primary)' }} />
                Validation Summary
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
                Found {parsedRows.length} questions. {validCount} valid and ready to import, {invalidCount} have warnings. {duplicateCount > 0 ? `${duplicateCount} duplicate${duplicateCount === 1 ? '' : 's'} will be skipped.` : ''}
              </p>
            </div>
            <button
              className="btn btn-primary"
              disabled={validCount === 0 || isImporting}
              onClick={handleImport}
              style={{ padding: '12px 24px' }}
            >
              <PlusCircle size={18} />
              {isImporting ? 'Saving Questions...' : `Import ${validCount} Valid Questions`}
            </button>
          </div>

          <div className="data-table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Row</th>
                  <th>Question Preview</th>
                  <th>Category</th>
                  <th>Source</th>
                  <th>Situation</th>
                  <th style={{ width: '80px' }}>Answer</th>
                  <th>Status & Diagnostic Info</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((row) => (
                  <tr key={row.rowNum} style={{ opacity: row.isValid ? 1 : 0.75 }}>
                    <td>Row {row.rowNum}</td>
                    <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.question || <span style={{ color: 'var(--danger)', fontStyle: 'italic' }}>[Empty Question]</span>}
                    </td>
                    <td>{row.category}</td>
                    <td>
                      {row.sourceExam ? (
                        <span className="badge badge-warning">{row.sourceExam}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>None</span>
                      )}
                    </td>
                    <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.situationText || <span style={{ color: 'var(--text-muted)' }}>None</span>}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {row.answer ? (
                        <span className="badge badge-primary">{row.answer}</span>
                      ) : (
                        <span style={{ color: 'var(--danger)' }}>--</span>
                      )}
                    </td>
                    <td>
                      {row.isValid ? (
                        <span className="badge badge-success" style={{ gap: '4px' }}>
                          <CheckCircle size={12} />
                          Valid
                        </span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {row.warnings.map((w, idx) => (
                            <span key={idx} className="badge badge-danger" style={{ gap: '4px', fontSize: '0.75rem' }}>
                              <AlertTriangle size={10} />
                              {w}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
