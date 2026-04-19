import React, { useState, useEffect, useRef } from 'react';
import {
  Container, Box, Typography, Paper, TextField, Button, Alert, Checkbox,
} from '@mui/material';
import { patientService } from '../services/api';
import { Patient } from '../types';

// ─── Data ────────────────────────────────────────────────────────────────────

const VACC_ROWS = [
  { age: 'At Birth', vaccines: 'BCG, OPV-0, Hepatitis B-1' },
  { age: '6 Weeks', vaccines: 'DTaP-1, IPV-1, Hib-1, Hep B-2, Rotavirus-1, PCV-1' },
  { age: '10 Weeks', vaccines: 'DTaP-2, IPV-2, Hib-2, Rotavirus-2' },
  { age: '14 Weeks', vaccines: 'DTaP-3, IPV-3, Hib-3, Hep B-3, Rotavirus-3*, PCV-2' },
  { age: '6 Months', vaccines: 'Influenza (start, then yearly)' },
  { age: '9 Months', vaccines: 'MMR-1, Typhoid Conjugate Vaccine (TCV), PCV Booster' },
  { age: '12 Months', vaccines: 'Hepatitis A-1' },
  { age: '15 Months', vaccines: 'MMR-2, Varicella-1' },
  { age: '16–18 Months', vaccines: 'DTaP Booster-1, IPV Booster, Hib Booster' },
  { age: '18–24 Months', vaccines: 'Hepatitis A-2' },
  { age: '2–5 Years', vaccines: 'Annual Influenza (yearly)' },
  { age: '4–6 Years', vaccines: 'DTaP Booster-2, OPV Booster, MMR-3, Varicella-2' },
  { age: '9–14 Years', vaccines: 'HPV (2 doses: 0, 6 months)' },
  { age: '10 Years', vaccines: 'Tdap' },
  { age: '16 Years', vaccines: 'Td Booster' },
];

const DEV_ROWS = [
  { age: '2 Months', milestones: 'Social smile, lifts head on tummy, coos, follows objects', redFlags: "No smile, no head control, doesn't respond to sounds" },
  { age: '4 Months', milestones: 'Laughs, steady head, reaches for toys, babbles', redFlags: "No head control, doesn't bring hands to mouth, no social smile" },
  { age: '6 Months', milestones: 'Sits with support, rolls over, responds to name, passes objects hand to hand', redFlags: "Not rolling, doesn't reach for objects, no babbling, stiff or floppy" },
  { age: '9 Months', milestones: 'Sits unsupported, crawls, pincer grasp, stranger anxiety, says mama/dada', redFlags: "Can't sit, no babbling, doesn't bear weight on legs, no gestures" },
  { age: '12 Months', milestones: 'Pulls to stand, cruises, 1–2 words, points, waves bye', redFlags: 'Not standing with support, no single words, no gestures, lost skills' },
  { age: '15 Months', milestones: 'Walks independently, 3–5 words, stacks 2 blocks, drinks from cup', redFlags: "Not walking, no words, no pointing, doesn't imitate" },
  { age: '18 Months', milestones: 'Runs, 10–20 words, scribbles, feeds self with spoon, points to body parts', redFlags: 'Not walking, fewer than 6 words, no pretend play, loss of skills' },
  { age: '24 Months', milestones: '2-word phrases, kicks ball, stacks 6 blocks, follows 2-step instructions', redFlags: "No 2-word phrases, doesn't follow instructions, can't walk steadily, lost skills" },
  { age: '30 Months', milestones: 'Jumps, 50+ words, 2–3 word sentences, pretend play, turns pages', redFlags: "Unclear speech, no pretend play, can't jump, doesn't interact with peers" },
  { age: '3 Years', milestones: 'Rides tricycle, 3-word sentences, dresses partially, plays with others', redFlags: "Can't climb stairs, drools/unclear speech, no sentences, no pretend play" },
  { age: '4 Years', milestones: 'Hops on one foot, tells stories, draws circles/cross, cooperative play', redFlags: "Can't jump, not understood by strangers, no interest in play, can't scribble" },
  { age: '5 Years', milestones: 'Skips, prints letters, counts to 10, dresses independently, tells full stories', redFlags: "Can't brush teeth/wash hands, lost skills, extremely fearful/aggressive, can't draw" },
];

const TEST_PACKAGES: Record<string, string[]> = {
  basic: ['CBC (Complete Blood Count)', 'CRP (C-Reactive Protein)', 'Urine Routine & Microscopy'],
  fever: ['CBC (Complete Blood Count)', 'CRP (C-Reactive Protein)', 'Blood Culture', 'Urine Routine & Microscopy', 'Malaria (MP/QBC)'],
  liver: ['Total Bilirubin', 'ALT (SGPT)', 'AST (SGOT)', 'ALP (Alkaline Phosphatase)', 'Serum Albumin', 'PT/INR'],
  renal: ['BUN (Blood Urea Nitrogen)', 'Serum Creatinine', 'Serum Electrolytes (Na, K, Cl, Ca)', 'Urine Routine & Microscopy'],
  thyroid: ['TSH', 'T3', 'T4', 'Free T4'],
  iron: ['Serum Iron', 'Serum Ferritin', 'TIBC', 'Transferrin Saturation'],
  allergy: ['IgE Total', 'Specific IgE Panel', 'Eosinophil Count (Absolute)'],
  newborn: ['TSH', 'G6PD Assay', 'Total Bilirubin', 'Blood Group & Rh Typing', 'Direct Coombs Test (DCT)'],
};

const TEST_CATEGORIES = [
  { label: 'Hematology', tests: ['CBC (Complete Blood Count)', 'Peripheral Smear', 'Reticulocyte Count', 'ESR', 'Bleeding Time', 'Clotting Time', 'PT/INR', 'aPTT', 'D-Dimer', 'Hemoglobin Electrophoresis', 'G6PD Assay', 'Blood Group & Rh Typing', 'Direct Coombs Test (DCT)'] },
  { label: 'Biochemistry', tests: ['Random Blood Sugar', 'Fasting Blood Sugar', 'HbA1c', 'BUN (Blood Urea Nitrogen)', 'Serum Creatinine', 'Serum Electrolytes (Na, K, Cl, Ca)', 'Serum Calcium', 'Serum Magnesium', 'Serum Phosphorus', 'Uric Acid', 'Total Bilirubin', 'Direct Bilirubin', 'ALT (SGPT)', 'AST (SGOT)', 'ALP (Alkaline Phosphatase)', 'GGT', 'Serum Albumin', 'Total Protein', 'Serum Amylase', 'Serum Lipase', 'LDH', 'CPK', 'Ammonia', 'Lactate'] },
  { label: 'Inflammatory Markers', tests: ['CRP (C-Reactive Protein)', 'Procalcitonin', 'ASO Titre', 'RF (Rheumatoid Factor)', 'ANA', 'Anti-dsDNA'] },
  { label: 'Iron & Nutrition', tests: ['Serum Iron', 'Serum Ferritin', 'TIBC', 'Transferrin Saturation', 'Vitamin D (25-OH)', 'Vitamin B12', 'Folate', 'Zinc'] },
  { label: 'Endocrine', tests: ['TSH', 'T3', 'T4', 'Free T4', 'Cortisol', 'Growth Hormone', 'IGF-1', 'Insulin'] },
  { label: 'Infectious Disease', tests: ['Blood Culture', 'Urine Culture', 'Stool Culture', 'Throat Swab Culture', 'Widal Test', 'Dengue NS1/IgM/IgG', 'Malaria (MP/QBC)', 'Mantoux Test (TB)', 'HIV ELISA', 'HBsAg', 'Anti-HCV', 'COVID-19 RT-PCR', 'Rapid Strep Test', 'Stool Ova & Parasites'] },
  { label: 'Allergy & Immunology', tests: ['IgE Total', 'Specific IgE Panel', 'Eosinophil Count (Absolute)', 'Immunoglobulin Panel (IgG, IgA, IgM)', 'C3/C4 Complement'] },
  { label: 'Urine & Stool', tests: ['Urine Routine & Microscopy', 'Urine Spot Protein/Creatinine', '24hr Urine Protein', 'Stool Routine', 'Stool Occult Blood', 'Stool Reducing Substances'] },
  { label: 'Imaging & Others', tests: ['X-Ray Chest', 'X-Ray Abdomen', 'X-Ray Bone Age', 'USG Abdomen', 'USG KUB', 'USG Cranial', 'ECHO (Echocardiography)', 'EEG', 'ECG', 'CT Scan', 'MRI Brain', 'ABG (Arterial Blood Gas)', 'CSF Analysis', 'Bone Marrow Aspiration', 'Pulmonary Function Test (PFT)'] },
];

const RX_CATEGORIES = [
  { label: 'Antipyretics / Analgesics', meds: ['Paracetamol (15mg/kg/dose)', 'Ibuprofen (10mg/kg/dose)', 'Mefenamic Acid'] },
  { label: 'Antibiotics', meds: ['Amoxicillin', 'Amoxicillin + Clavulanate', 'Azithromycin', 'Cefixime', 'Cefpodoxime', 'Cephalexin', 'Ceftriaxone (IV/IM)', 'Cotrimoxazole (TMP-SMX)', 'Erythromycin', 'Metronidazole', 'Ciprofloxacin', 'Nitrofurantoin', 'Cloxacillin'] },
  { label: 'Antihistamines / Allergy', meds: ['Cetirizine', 'Levocetirizine', 'Fexofenadine', 'Chlorpheniramine (CPM)', 'Hydroxyzine', 'Montelukast'] },
  { label: 'Cough & Cold / Respiratory', meds: ['Salbutamol Syrup/Nebulization', 'Levosalbutamol', 'Ipratropium Bromide (Neb)', 'Budesonide (Neb/Inhaler)', 'Fluticasone Inhaler', 'Ambroxol', 'Dextromethorphan', 'Guaifenesin', 'Normal Saline Nasal Drops', 'Xylometazoline Nasal Drops'] },
  { label: 'GI / Antiemetics / Antacids', meds: ['ORS (Oral Rehydration Solution)', 'Zinc Sulphate (20mg)', 'Ondansetron', 'Domperidone', 'Ranitidine', 'Omeprazole', 'Pantoprazole', 'Sucralfate', 'Lactobacillus (Probiotics)', 'Racecadotril'] },
  { label: 'Antifungals', meds: ['Fluconazole', 'Clotrimazole (Topical)', 'Miconazole (Topical)', 'Nystatin Oral Drops', 'Griseofulvin'] },
  { label: 'Antiparasitics / Anthelmintics', meds: ['Albendazole (400mg)', 'Mebendazole', 'Ivermectin', 'Pyrantel Pamoate'] },
  { label: 'Steroids / Anti-inflammatory', meds: ['Prednisolone', 'Dexamethasone', 'Hydrocortisone (IV)', 'Methylprednisolone'] },
  { label: 'Vitamins & Supplements', meds: ['Iron Syrup (Ferrous Sulphate/Fumarate)', 'Folic Acid', 'Vitamin D3 Drops/Sachets', 'Calcium Syrup/Tablets', 'Multivitamin Drops/Syrup', 'Vitamin A', 'Vitamin B Complex', 'Vitamin C', 'Zinc Supplement'] },
  { label: 'Antiepileptics / CNS', meds: ['Phenobarbitone', 'Phenytoin', 'Sodium Valproate', 'Carbamazepine', 'Levetiracetam', 'Clobazam', 'Midazolam (Buccal/IV)', 'Diazepam (Rectal/IV)'] },
  { label: 'Topical / Dermatology', meds: ['Calamine Lotion', 'Mupirocin Ointment', 'Fusidic Acid Cream', 'Hydrocortisone Cream (1%)', 'Permethrin Lotion (5%)', 'Silver Sulfadiazine Cream', 'Moisturizer/Emollient'] },
  { label: 'Eye / Ear Drops', meds: ['Ciprofloxacin Eye Drops', 'Tobramycin Eye Drops', 'Moxifloxacin Eye Drops', 'Ofloxacin Ear Drops', 'Neomycin + Polymyxin Ear Drops'] },
  { label: 'Emergency / IV Fluids', meds: ['Normal Saline (NS) IV', 'Ringer Lactate (RL) IV', 'Dextrose 5%/10% IV', 'DNS (Dextrose Normal Saline)', 'Adrenaline (Epinephrine)', 'Atropine'] },
];

// ─── Chip component ───────────────────────────────────────────────────────────
const Chip: React.FC<{ label: string; checked: boolean; onClick: () => void }> = ({ label, checked, onClick }) => (
  <Box component="span" onClick={onClick} sx={{
    display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1.25, py: 0.5,
    border: '1px solid', borderColor: checked ? 'primary.main' : '#ddd',
    borderRadius: '16px', fontSize: 12, cursor: 'pointer', userSelect: 'none',
    background: checked ? 'primary.main' : 'white', color: checked ? 'white' : 'text.primary',
    bgcolor: checked ? '#1976d2' : 'white',
    '&:hover': { bgcolor: checked ? '#1565c0' : '#e3f2fd' },
    transition: 'all 0.15s',
  }}>
    {label}
  </Box>
);

// ─── Section wrapper ─────────────────────────────────────────────────────────
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Paper variant="outlined" sx={{ p: 2, mb: 2, background: '#fafafa', borderRadius: 2 }}>
    <Typography variant="subtitle1" fontWeight={600} color="primary" mb={1.5}>{title}</Typography>
    {children}
  </Paper>
);

// ─── Main component ───────────────────────────────────────────────────────────
const Consultation: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Vitals
  const [vitals, setVitals] = useState({ height: '', weight: '', headCirc: '', temp: '', bp: '', hr: '', rr: '', spo2: '' });
  // History
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [historyIllness, setHistoryIllness] = useState('');
  const [presentIllness, setPresentIllness] = useState('');
  const [pastIllness, setPastIllness] = useState('');
  // Vaccination
  const [vaccAge, setVaccAge] = useState<string[]>(Array(15).fill(''));
  const [vaccDone, setVaccDone] = useState<boolean[]>(Array(15).fill(false));
  // Development
  const [devDone, setDevDone] = useState<boolean[]>(Array(12).fill(false));
  const [devFlag, setDevFlag] = useState<boolean[]>(Array(12).fill(false));
  const [devNote, setDevNote] = useState<string[]>(Array(12).fill(''));
  // Assessment
  const [diffDiagnosis, setDiffDiagnosis] = useState('');
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
  const [testSearch, setTestSearch] = useState('');
  const [otherTests, setOtherTests] = useState('');
  const [selectedRx, setSelectedRx] = useState<Set<string>>(new Set());
  const [rxSearch, setRxSearch] = useState('');
  const [otherRx, setOtherRx] = useState('');
  const [advice, setAdvice] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    patientService.getAll().then(r => setPatients(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const showAlert = (type: 'success' | 'error', msg: string) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  };

  const filtered = patients.filter(p =>
    search.trim() && (
      (p.first_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.last_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.phone || '').includes(search)
    )
  );

  const selectPatient = (p: Patient) => {
    setPatient(p);
    setSearch(`${p.first_name} ${p.last_name || ''} — ${p.phone}`);
    setShowDropdown(false);
    setVitals({ height: '', weight: '', headCirc: '', temp: '', bp: '', hr: '', rr: '', spo2: '' });
    setChiefComplaint(''); setHistoryIllness(''); setPresentIllness(''); setPastIllness('');
    setVaccAge(Array(15).fill('')); setVaccDone(Array(15).fill(false));
    setDevDone(Array(12).fill(false)); setDevFlag(Array(12).fill(false)); setDevNote(Array(12).fill(''));
    setDiffDiagnosis(''); setSelectedTests(new Set()); setOtherTests('');
    setSelectedRx(new Set()); setOtherRx(''); setAdvice(''); setNotes('');
  };

  const toggleTest = (t: string) => setSelectedTests(prev => { const s = new Set(prev); s.has(t) ? s.delete(t) : s.add(t); return s; });
  const toggleRx = (r: string) => setSelectedRx(prev => { const s = new Set(prev); s.has(r) ? s.delete(r) : s.add(r); return s; });
  const togglePackage = (pkg: string, checked: boolean) => {
    setSelectedTests(prev => {
      const s = new Set(prev);
      TEST_PACKAGES[pkg].forEach(t => checked ? s.add(t) : s.delete(t));
      return s;
    });
  };

  const saveConsultation = async () => {
    if (!patient) return showAlert('error', 'Please select a patient first');
    const parts: string[] = [];
    if (vitals.height) parts.push(`Height: ${vitals.height} cm`);
    if (vitals.weight) parts.push(`Weight: ${vitals.weight} kg`);
    if (vitals.headCirc) parts.push(`Head Circumference: ${vitals.headCirc} cm`);
    if (vitals.temp) parts.push(`Temperature: ${vitals.temp} °F`);
    if (vitals.bp) parts.push(`BP: ${vitals.bp}`);
    if (vitals.hr) parts.push(`Heart Rate: ${vitals.hr} bpm`);
    if (vitals.rr) parts.push(`Respiratory Rate: ${vitals.rr} breaths/min`);
    if (vitals.spo2) parts.push(`SpO2: ${vitals.spo2}%`);
    if (chiefComplaint) parts.push(`Chief Complaint: ${chiefComplaint}`);
    if (historyIllness) parts.push(`History of Illness: ${historyIllness}`);
    if (presentIllness) parts.push(`History of Present Illness: ${presentIllness}`);
    const vaccData: string[] = [];
    VACC_ROWS.forEach((row, i) => { if (vaccAge[i] || vaccDone[i]) vaccData.push(`${row.age}:${vaccDone[i] ? 'Yes' : 'No'}${vaccAge[i] ? '@' + vaccAge[i] : ''}`); });
    if (vaccData.length) parts.push(`Vaccination: ${vaccData.join('; ')}`);
    const devData: string[] = [];
    DEV_ROWS.forEach((row, i) => { if (devDone[i] || devFlag[i] || devNote[i]) devData.push(`${row.age}:${devDone[i] ? 'Achieved' : ''}${devFlag[i] ? 'RedFlag' : ''}${devNote[i] ? '(' + devNote[i] + ')' : ''}`); });
    if (devData.length) parts.push(`Development: ${devData.join('; ')}`);
    if (pastIllness) parts.push(`Past Illness: ${pastIllness}`);
    if (diffDiagnosis) parts.push(`Differential Diagnosis: ${diffDiagnosis}`);
    const allTests = [...Array.from(selectedTests), ...(otherTests.trim() ? [otherTests.trim()] : [])];
    if (allTests.length) parts.push(`Tests Suggested: ${allTests.join(', ')}`);
    const allRx = [...Array.from(selectedRx), ...(otherRx.trim() ? [otherRx.trim()] : [])];
    if (allRx.length) parts.push(`Prescription: ${allRx.join(', ')}`);
    if (advice) parts.push(`Suggestions/Medical Advice: ${advice}`);
    if (notes) parts.push(`Additional Notes: ${notes}`);
    const record = `[${new Date().toLocaleString()}] ` + parts.join(' | ');
    try {
      const existing = await patientService.getById(patient.id);
      const history = existing.data.medical_history ? existing.data.medical_history + '\n---\n' + record : record;
      await patientService.update(patient.id, { first_name: patient.first_name, phone: patient.phone, medical_history: history });
      showAlert('success', 'Consultation saved successfully!');
      setPatient(null); setSearch('');
    } catch (e: any) { showAlert('error', e.response?.data?.detail || 'Failed to save'); }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 3 }}>
        {alert && <Alert severity={alert.type} sx={{ mb: 2 }}>{alert.msg}</Alert>}

        <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
          {/* Patient Search */}
          <Box sx={{ position: 'relative', mb: 2 }} ref={dropdownRef}>
            <TextField fullWidth label="Search Patient (by name or phone)" placeholder="Type name or phone number..."
              value={search} size="small"
              onChange={e => { setSearch(e.target.value); setShowDropdown(true); if (!e.target.value) setPatient(null); }}
              onFocus={() => search && setShowDropdown(true)}
            />
            {showDropdown && search.trim() && (
              <Paper elevation={3} sx={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, maxHeight: 200, overflowY: 'auto' }}>
                {filtered.length === 0
                  ? <Box sx={{ p: 1.5, color: 'text.secondary', fontSize: 14 }}>No patients found</Box>
                  : filtered.map(p => (
                    <Box key={p.id} onClick={() => selectPatient(p)}
                      sx={{ p: 1.5, cursor: 'pointer', borderBottom: '1px solid #eee', '&:hover': { background: '#f0f7ff' }, fontSize: 14 }}>
                      <strong>{p.first_name} {p.last_name || ''}</strong> — {p.phone}
                    </Box>
                  ))}
              </Paper>
            )}
          </Box>

          {patient && (
            <>
              {/* Patient Info */}
              <Paper sx={{ p: 2, mb: 2, background: '#e3f2fd', borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} color="primary" mb={0.5}>Patient Info</Typography>
                <Typography variant="body2">
                  <strong>Name:</strong> {patient.first_name} {patient.last_name || ''} &nbsp;&nbsp;
                  <strong>Phone:</strong> {patient.phone} &nbsp;&nbsp;
                  <strong>Gender:</strong> {patient.gender || 'N/A'} &nbsp;&nbsp;
                  <strong>DOB:</strong> {patient.date_of_birth ? patient.date_of_birth.split('T')[0] : 'N/A'}
                </Typography>
              </Paper>

              {/* Vitals */}
              <Section title="Vitals">
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <TextField size="small" label="Height (cm)" type="number" value={vitals.height} onChange={e => setVitals(v => ({ ...v, height: e.target.value }))} />
                  <TextField size="small" label="Weight (kg)" type="number" value={vitals.weight} onChange={e => setVitals(v => ({ ...v, weight: e.target.value }))} />
                  <TextField size="small" label="Head Circumference (cm)" type="number" value={vitals.headCirc} onChange={e => setVitals(v => ({ ...v, headCirc: e.target.value }))} />
                  <TextField size="small" label="Temperature (°F)" type="number" inputProps={{ step: 0.1 }} value={vitals.temp} onChange={e => setVitals(v => ({ ...v, temp: e.target.value }))} />
                  <TextField size="small" label="BP (mmHg)" placeholder="e.g. 120/80" value={vitals.bp} onChange={e => setVitals(v => ({ ...v, bp: e.target.value }))} />
                  <TextField size="small" label="Heart Rate (bpm)" type="number" value={vitals.hr} onChange={e => setVitals(v => ({ ...v, hr: e.target.value }))} />
                  <TextField size="small" label="Respiratory Rate (breaths/min)" type="number" value={vitals.rr} onChange={e => setVitals(v => ({ ...v, rr: e.target.value }))} />
                  <TextField size="small" label="SpO2 (%)" type="number" value={vitals.spo2} onChange={e => setVitals(v => ({ ...v, spo2: e.target.value }))} />
                </Box>
              </Section>

              {/* History */}
              <Section title="History">
                <TextField fullWidth multiline rows={2} label="Chief Complaint" sx={{ mb: 1.5 }} value={chiefComplaint} onChange={e => setChiefComplaint(e.target.value)} />
                <TextField fullWidth multiline rows={2} label="History of Illness" sx={{ mb: 1.5 }} value={historyIllness} onChange={e => setHistoryIllness(e.target.value)} />
                <TextField fullWidth multiline rows={2} label="History of Present Illness" sx={{ mb: 2 }} value={presentIllness} onChange={e => setPresentIllness(e.target.value)} />

                {/* Vaccination Table */}
                <Typography variant="body2" fontWeight={600} mb={1}>Vaccination Schedule</Typography>
                <Box sx={{ overflowX: 'auto', mb: 2 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#e3f2fd' }}>
                        <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', width: '12%' }}>Age</th>
                        <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Vaccines</th>
                        <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', width: '15%' }}>Age Given At</th>
                        <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', width: '10%' }}>Up to Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {VACC_ROWS.map((row, i) => (
                        <tr key={i}>
                          <td style={{ padding: '6px 8px', border: '1px solid #eee', fontWeight: 600 }}>{row.age}</td>
                          <td style={{ padding: '6px 8px', border: '1px solid #eee' }}>{row.vaccines}</td>
                          <td style={{ padding: '4px', border: '1px solid #eee' }}>
                            <input value={vaccAge[i]} onChange={e => setVaccAge(a => { const n = [...a]; n[i] = e.target.value; return n; })}
                              style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: 3, fontSize: 12 }} />
                          </td>
                          <td style={{ padding: '4px', border: '1px solid #eee', textAlign: 'center' }}>
                            <Checkbox size="small" checked={vaccDone[i]} onChange={e => setVaccDone(a => { const n = [...a]; n[i] = e.target.checked; return n; })} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>

                {/* Development Milestones */}
                <Typography variant="body2" fontWeight={600} mb={1}>Developmental Milestones (AAP Screening)</Typography>
                <Box sx={{ overflowX: 'auto', mb: 2 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#e8f5e9' }}>
                        <th style={{ padding: '8px', border: '1px solid #ddd', width: '10%' }}>Age</th>
                        <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Milestones</th>
                        <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Red Flags</th>
                        <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', width: '10%' }}>Achieved</th>
                        <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', width: '10%' }}>Red Flag</th>
                        <th style={{ padding: '8px', border: '1px solid #ddd', width: '12%' }}>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {DEV_ROWS.map((row, i) => (
                        <tr key={i}>
                          <td style={{ padding: '6px 8px', border: '1px solid #eee', fontWeight: 600 }}>{row.age}</td>
                          <td style={{ padding: '6px 8px', border: '1px solid #eee' }}>{row.milestones}</td>
                          <td style={{ padding: '6px 8px', border: '1px solid #eee', color: '#c62828' }}>{row.redFlags}</td>
                          <td style={{ padding: '4px', border: '1px solid #eee', textAlign: 'center' }}>
                            <Checkbox size="small" checked={devDone[i]} onChange={e => setDevDone(a => { const n = [...a]; n[i] = e.target.checked; return n; })} />
                          </td>
                          <td style={{ padding: '4px', border: '1px solid #eee', textAlign: 'center' }}>
                            <Checkbox size="small" checked={devFlag[i]} onChange={e => setDevFlag(a => { const n = [...a]; n[i] = e.target.checked; return n; })} />
                          </td>
                          <td style={{ padding: '4px', border: '1px solid #eee' }}>
                            <input value={devNote[i]} onChange={e => setDevNote(a => { const n = [...a]; n[i] = e.target.value; return n; })}
                              style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: 3, fontSize: 12 }} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>

                <TextField fullWidth multiline rows={2} label="Past Illness" value={pastIllness} onChange={e => setPastIllness(e.target.value)} />
              </Section>

              {/* Assessment & Plan */}
              <Section title="Assessment & Plan">
                <TextField fullWidth multiline rows={2} label="Differential Diagnosis" sx={{ mb: 2 }} value={diffDiagnosis} onChange={e => setDiffDiagnosis(e.target.value)} />

                {/* Tests */}
                <Typography variant="body2" fontWeight={600} mb={1}>Tests Suggested</Typography>
                <TextField fullWidth size="small" placeholder="Search tests..." value={testSearch} onChange={e => setTestSearch(e.target.value)} sx={{ mb: 1 }} />
                <Typography variant="caption" color="primary" fontWeight={600} display="block" mb={0.5}>Packages</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
                  {Object.keys(TEST_PACKAGES).map(pkg => {
                    const allSelected = TEST_PACKAGES[pkg].every(t => selectedTests.has(t));
                    return <Chip key={pkg} label={pkg.charAt(0).toUpperCase() + pkg.slice(1) + ' Panel'} checked={allSelected} onClick={() => togglePackage(pkg, !allSelected)} />;
                  })}
                </Box>
                {TEST_CATEGORIES.map(cat => {
                  const filtered = cat.tests.filter(t => !testSearch || t.toLowerCase().includes(testSearch.toLowerCase()));
                  if (filtered.length === 0) return null;
                  return (
                    <Box key={cat.label} sx={{ mb: 1.5 }}>
                      <Typography variant="caption" color="success.dark" fontWeight={600} display="block" mb={0.5}>{cat.label}</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                        {filtered.map(t => <Chip key={t} label={t} checked={selectedTests.has(t)} onClick={() => toggleTest(t)} />)}
                      </Box>
                    </Box>
                  );
                })}
                <TextField fullWidth size="small" label="Other Tests (free text)" value={otherTests} onChange={e => setOtherTests(e.target.value)} sx={{ mt: 1 }} />

                {/* Prescription */}
                <Typography variant="body2" fontWeight={600} mt={2} mb={1}>Prescription</Typography>
                <TextField fullWidth size="small" placeholder="Search medicines..." value={rxSearch} onChange={e => setRxSearch(e.target.value)} sx={{ mb: 1 }} />
                {RX_CATEGORIES.map(cat => {
                  const filteredMeds = cat.meds.filter(m => !rxSearch || m.toLowerCase().includes(rxSearch.toLowerCase()));
                  if (filteredMeds.length === 0) return null;
                  return (
                    <Box key={cat.label} sx={{ mb: 1.5 }}>
                      <Typography variant="caption" color="success.dark" fontWeight={600} display="block" mb={0.5}>{cat.label}</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                        {filteredMeds.map(m => <Chip key={m} label={m} checked={selectedRx.has(m)} onClick={() => toggleRx(m)} />)}
                      </Box>
                    </Box>
                  );
                })}
                <TextField fullWidth size="small" label="Other Medicines (free text)" value={otherRx} onChange={e => setOtherRx(e.target.value)} sx={{ mt: 1 }} />

                <TextField fullWidth multiline rows={2} label="Suggestions / Medical Advice" sx={{ mt: 2 }} value={advice} onChange={e => setAdvice(e.target.value)} />
                <TextField fullWidth multiline rows={2} label="Additional Notes" sx={{ mt: 1.5 }} value={notes} onChange={e => setNotes(e.target.value)} />
              </Section>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" size="large" onClick={saveConsultation}>Save Consultation</Button>
              </Box>
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default Consultation;
