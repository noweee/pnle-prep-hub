import XLSX from 'xlsx';

const headers = ['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer', 'Rationale', 'Category'];
const data = [
  [
    'A client is admitted with a diagnosis of acute pancreatitis. Which of the following laboratory values should the nurse expect to be elevated?',
    'Serum calcium',
    'Serum amylase',
    'Blood urea nitrogen',
    'Serum potassium',
    'B',
    'Serum amylase and lipase are digestive enzymes produced by the pancreas. In acute pancreatitis, pancreatic cells are damaged, causing these enzymes to leak into the blood, resulting in elevated levels.',
    'NP III: Care of Clients with Physiologic and Psychosocial Alterations (Part A)'
  ],
  [
    'Which of the following is the primary responsibility of a community health nurse?',
    'Providing acute bedside care in hospitals',
    'Performing specialized minor surgical procedures',
    'Health promotion, disease prevention, and education in the community',
    'Administering complex chemotherapy treatments in outpatient clinics',
    'C',
    'Community health nursing focuses on population-based health, where the primary emphasis is on promoting wellness and preventing disease through education, immunization, and community-wide safety campaigns.',
    'NP II: Community Health Nursing and Care of the Mother and Child'
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
    'NP IV: Care of Clients with Physiologic and Psychosocial Alterations (Part B)'
  ],
  [
    'A patient with major depressive disorder is prescribed an SSRI. The nurse should instruct the patient to monitor for which critical, life-threatening syndrome?',
    'Serotonin syndrome (agitation, fever, tremors, hyperreflexia)',
    'Hypertensive crisis triggered by tyramine-rich foods (aged cheese)',
    'Neuroleptic malignant syndrome (rigidity, hyperpyrexia)',
    'Agranulocytosis (sudden drop in white blood cell count)',
    'A',
    'SSRI side effects include Serotonin Syndrome, characterized by cognitive alterations (agitation, confusion), autonomic hyperactivity (sweating, fever), and neuromuscular abnormalities (tremors, hyperreflexia).',
    'NP V: Care of Clients with Physiologic and Psychosocial Alterations (Part C)'
  ],
  [
    'A client with congestive heart failure is receiving digoxin. The nurse knows that which electrolyte imbalance increases the risk of digoxin toxicity?',
    'Hyperkalemia',
    'Hypokalemia',
    'Hypernatremia',
    'Hyponatremia',
    'B',
    'Hypokalemia (low serum potassium) increases the sensitivity of the myocardial cells to digoxin, significantly increasing the risk of digoxin toxicity. Serum potassium must be monitored closely, especially if the client is receiving potassium-wasting diuretics.',
    'NP III: Care of Clients with Physiologic and Psychosocial Alterations (Part A)'
  ],
  [
    'Under the principle of Informed Consent, which of the following is true regarding the nurse\'s role in obtaining informed consent for a surgical procedure?',
    'The nurse is responsible for explaining the risks and benefits of the surgery.',
    'The nurse\'s signature witnesses that the client signed the form voluntarily and is competent.',
    'The nurse can obtain consent even if the client does not understand the procedure.',
    'The nurse is responsible for obtaining consent if the physician is too busy.',
    'B',
    'The physician is legally responsible for explaining the procedure, risks, and alternatives. The nurse acts as a witness to the client\'s signature, verifying that the client signed voluntarily, is competent to consent, and that the signature is authentic.',
    'NP I: Foundation of Professional Nursing Practice'
  ]
];

const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Mock Questions");

// Set default widths
worksheet['!cols'] = Array(headers.length).fill(0).map((_, i) => ({
  wch: i === 0 || i === 6 ? 40 : 22
}));

XLSX.writeFile(workbook, "mock_pnle_questions.xlsx");
console.log("Mock Excel file mock_pnle_questions.xlsx generated successfully in the root directory!");
