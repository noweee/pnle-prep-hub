import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileText, Download, CheckCircle, AlertTriangle, PlusCircle } from 'lucide-react';
import { Question } from '../types';

interface ExcelUploadProps {
  onQuestionsImported: (questions: Question[]) => void;
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
  warnings: string[];
  isValid: boolean;
}

export default function ExcelUpload({ onQuestionsImported }: ExcelUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isParsing, setIsParsing] = useState(false);
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
            warnings,
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

  const handleImport = () => {
    const validQuestions: Question[] = parsedRows
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
        category: row.category
      }));

    if (validQuestions.length === 0) {
      alert("No valid questions found to import. Please check file formatting.");
      return;
    }

    onQuestionsImported(validQuestions);
    setParsedRows([]);
    setFileName('');
  };

  // Generate and download a sample excel file
  const downloadSampleTemplate = () => {
    const headers = ['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer', 'Rationale', 'Category'];
    const sampleData = [
      [
        'A client is admitted with a diagnosis of acute pancreatitis. Which of the following laboratory values should the nurse expect to be elevated?',
        'Serum calcium',
        'Serum amylase',
        'Blood urea nitrogen',
        'Serum potassium',
        'B',
        'Serum amylase and lipase are digestive enzymes produced by the pancreas. In acute pancreatitis, pancreatic cells are damaged, causing these enzymes to leak into the blood, resulting in elevated levels.',
        'NP III: Care of Clients with Physiologic and Psychosocial Alterations'
      ],
      [
        'Which of the following is the primary responsibility of a community health nurse?',
        'Providing acute bedside care in hospitals',
        'Performing specialized minor surgical procedures',
        'Health promotion, disease prevention, and education in the community',
        'Administering complex chemotherapy treatments in outpatient clinics',
        'C',
        'Community health nursing focuses on population-based health, where the primary emphasis is on promoting wellness and preventing disease through education, immunization, and community-wide safety campaigns.',
        'NP II: Community Health Nursing and Mother-Child Care'
      ],
      [
        'According to the Philippine Nursing Act of 2002 (RA 9173), what is the minimum educational requirement for a Dean of a College of Nursing?',
        'Bachelor of Science in Nursing',
        'Master of Arts in Nursing (or Master of Science in Nursing)',
        'Doctor of Philosophy in Nursing Education',
        'Master of Science in Public Health Education',
        'B',
        'Republic Act 9173 (Philippine Nursing Law) specifies that a Dean of a College of Nursing in the Philippines must hold a Master\'s degree in nursing (MAN/MSN) and have at least 5 years of teaching experience.',
        'NP I: Foundation of Professional Nursing Practice'
      ],
      [
        'A nurse is caring for a client receiving blood transfusion. The client suddenly develops chills, fever, and low back pain. Which action should the nurse take first?',
        'Slow down the transfusion rate to 50 mL/hour',
        'Administer oral acetaminophen to relieve fever and pain',
        'Stop the transfusion immediately',
        'Notify the attending physician and blood bank clerk',
        'C',
        'Chills, fever, and low back pain indicate a potential acute hemolytic transfusion reaction. The immediate priority is to stop the transfusion to prevent further infusing of incompatible blood, which can cause renal failure.',
        'NP IV: Care of Clients with Physiologic and Psychosocial Alterations'
      ],
      [
        'A patient with major depressive disorder is prescribed an SSRI. The nurse should instruct the patient to monitor for which critical, life-threatening syndrome?',
        'Serotonin syndrome (agitation, fever, tremors, hyperreflexia)',
        'Hypertensive crisis triggered by tyramine-rich foods (aged cheese)',
        'Neuroleptic malignant syndrome (rigidity, hyperpyrexia)',
        'Agranulocytosis (sudden drop in white blood cell count)',
        'A',
        'SSRI side effects include Serotonin Syndrome, characterized by cognitive alterations (agitation, confusion), autonomic hyperactivity (sweating, fever), and neuromuscular abnormalities (tremors, hyperreflexia).',
        'NP V: Care of Clients with Physiologic and Psychosocial Alterations'
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
                  <td>Must be <code>A</code>, <code>B</code>, <code>C</code>, or <code>D</code> (or exact choice text)</td>
                </tr>
                <tr>
                  <td><strong>Rationale</strong></td>
                  <td>Critical explanation/nursing rationale (optional)</td>
                  <td>Text explaining the physiology, law, or priority basis</td>
                </tr>
                <tr>
                  <td><strong>Category</strong></td>
                  <td>Board exam classification / subject (optional)</td>
                  <td>e.g., <em>NP I: Foundations</em>, <em>NP III: Medical Surgical</em></td>
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
                Found {parsedRows.length} questions. {validCount} valid and ready to import, {invalidCount} have warnings.
              </p>
            </div>
            <button
              className="btn btn-primary"
              disabled={validCount === 0}
              onClick={handleImport}
              style={{ padding: '12px 24px' }}
            >
              <PlusCircle size={18} />
              Import {validCount} Valid Questions
            </button>
          </div>

          <div className="data-table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Row</th>
                  <th>Question Preview</th>
                  <th>Category</th>
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
