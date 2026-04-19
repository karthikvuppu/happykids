import React, { useState, useEffect, useRef } from 'react';
import {
  Container, Box, Typography, Paper, TextField, Button, Alert,
  Select, MenuItem, FormControl, InputLabel, Tabs, Tab,
} from '@mui/material';
import { patientService } from '../services/api';
import { Patient } from '../types';

const VitalsForm: React.FC<{
  prefix: string;
  values: Record<string, string>;
  onChange: (field: string, val: string) => void;
}> = ({ prefix, values, onChange }) => (
  <Paper variant="outlined" sx={{ p: 2, mt: 2, background: '#fafafa', borderRadius: 2 }}>
    <Typography variant="subtitle1" fontWeight={600} color="primary" mb={1.5}>Vitals</Typography>
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
      <TextField size="small" label="Height (cm)" type="number" value={values[`${prefix}Height`] || ''} onChange={e => onChange(`${prefix}Height`, e.target.value)} />
      <TextField size="small" label="Weight (kg)" type="number" value={values[`${prefix}Weight`] || ''} onChange={e => onChange(`${prefix}Weight`, e.target.value)} />
      <TextField size="small" label="Head Circumference (cm)" type="number" value={values[`${prefix}HeadCirc`] || ''} onChange={e => onChange(`${prefix}HeadCirc`, e.target.value)} />
      <TextField size="small" label="Temperature (°F)" type="number" inputProps={{ step: 0.1 }} value={values[`${prefix}Temp`] || ''} onChange={e => onChange(`${prefix}Temp`, e.target.value)} />
      <TextField size="small" label="BP (mmHg)" placeholder="e.g. 120/80" value={values[`${prefix}BP`] || ''} onChange={e => onChange(`${prefix}BP`, e.target.value)} />
      <TextField size="small" label="Heart Rate (bpm)" type="number" value={values[`${prefix}HR`] || ''} onChange={e => onChange(`${prefix}HR`, e.target.value)} />
      <TextField size="small" label="Respiratory Rate (breaths/min)" type="number" value={values[`${prefix}RR`] || ''} onChange={e => onChange(`${prefix}RR`, e.target.value)} />
      <TextField size="small" label="SpO2 (%)" type="number" value={values[`${prefix}SpO2`] || ''} onChange={e => onChange(`${prefix}SpO2`, e.target.value)} />
    </Box>
    <TextField fullWidth multiline rows={3} label="Chief Complaint" placeholder="Free text write-up..." sx={{ mt: 1.5 }} value={values[`${prefix}VitalNotes`] || ''} onChange={e => onChange(`${prefix}VitalNotes`, e.target.value)} />
  </Paper>
);

const buildVitalsString = (prefix: string, v: Record<string, string>): string => {
  const parts: string[] = [];
  if (v[`${prefix}Height`]) parts.push(`Height: ${v[`${prefix}Height`]} cm`);
  if (v[`${prefix}Weight`]) parts.push(`Weight: ${v[`${prefix}Weight`]} kg`);
  if (v[`${prefix}HeadCirc`]) parts.push(`Head Circumference: ${v[`${prefix}HeadCirc`]} cm`);
  if (v[`${prefix}Temp`]) parts.push(`Temperature: ${v[`${prefix}Temp`]} °F`);
  if (v[`${prefix}BP`]) parts.push(`BP: ${v[`${prefix}BP`]}`);
  if (v[`${prefix}HR`]) parts.push(`Heart Rate: ${v[`${prefix}HR`]} bpm`);
  if (v[`${prefix}RR`]) parts.push(`Respiratory Rate: ${v[`${prefix}RR`]} breaths/min`);
  if (v[`${prefix}SpO2`]) parts.push(`SpO2: ${v[`${prefix}SpO2`]}%`);
  if (v[`${prefix}VitalNotes`]) parts.push(`Chief Complaint: ${v[`${prefix}VitalNotes`]}`);
  return parts.join(' | ');
};

const parseVitals = (medical_history: string, prefix: string): Record<string, string> => {
  const getVital = (label: string) => {
    const m = medical_history.match(new RegExp(label + ':\\s*([^|\\n]*)'));
    return m ? m[1].trim().replace(/\s*(cm|kg|bpm|breaths\/min|°F|%)$/, '') : '';
  };
  return {
    [`${prefix}Height`]: getVital('Height'),
    [`${prefix}Weight`]: getVital('Weight'),
    [`${prefix}HeadCirc`]: getVital('Head Circumference'),
    [`${prefix}Temp`]: getVital('Temperature'),
    [`${prefix}BP`]: getVital('BP'),
    [`${prefix}HR`]: getVital('Heart Rate'),
    [`${prefix}RR`]: getVital('Respiratory Rate'),
    [`${prefix}SpO2`]: getVital('SpO2'),
    [`${prefix}VitalNotes`]: getVital('Chief Complaint'),
  };
};

const emptyAdd: Record<string, string> = {
  pFirst: '', pLast: '', pEmail: '', pPhone: '', pGender: '', pDob: '',
  pAddress: '', pCity: '', pWhatsapp: '',
  pHeight: '', pWeight: '', pHeadCirc: '', pTemp: '', pBP: '', pHR: '', pRR: '', pSpO2: '', pVitalNotes: '',
};

const Patients: React.FC = () => {
  const [tab, setTab] = useState(1);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [addForm, setAddForm] = useState<Record<string, string>>(emptyAdd);
  const [viewForm, setViewForm] = useState<Record<string, string>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadPatients(); }, [loadPatients]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const loadPatients = async () => {
    try {
      const res = await patientService.getAll();
      setPatients(res.data);
    } catch { showAlert('error', 'Failed to load patients'); }
  };

  const filteredPatients = patients.filter(p =>
    search.trim() && (
      (p.first_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.last_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.phone || '').includes(search)
    )
  );

  const selectPatient = (p: Patient) => {
    setSelectedPatient(p);
    setSearch(`${p.first_name} ${p.last_name || ''} — ${p.phone}`);
    setShowDropdown(false);
    setViewForm({
      vFirst: p.first_name || '', vLast: p.last_name || '', vEmail: p.email || '',
      vPhone: p.phone || '', vGender: p.gender || '',
      vDob: p.date_of_birth ? p.date_of_birth.split('T')[0] : '',
      vAddress: p.address || '', vCity: p.city || '', vWhatsapp: p.emergency_phone || '',
      ...parseVitals(p.medical_history || '', 'v'),
    });
  };

  const handleViewChange = (field: string, val: string) => setViewForm(prev => ({ ...prev, [field]: val }));
  const handleAddChange = (field: string, val: string) => setAddForm(prev => ({ ...prev, [field]: val }));

  const addAppointment = async () => {
    if (!selectedPatient) return showAlert('error', 'Please select a patient first');
    if (!viewForm.vFirst || !viewForm.vPhone) return showAlert('error', 'First Name and Phone are required');
    try {
      const vitals = buildVitalsString('v', viewForm);
      await patientService.update(selectedPatient.id, {
        first_name: viewForm.vFirst, last_name: viewForm.vLast || undefined,
        email: viewForm.vEmail || undefined, phone: viewForm.vPhone,
        gender: viewForm.vGender || undefined,
        date_of_birth: viewForm.vDob ? viewForm.vDob + 'T00:00:00' : undefined,
        address: viewForm.vAddress || undefined, city: viewForm.vCity || undefined,
        emergency_phone: viewForm.vWhatsapp || undefined,
        medical_history: vitals || undefined,
      });
      showAlert('success', 'Appointment added successfully!');
      setSelectedPatient(null); setSearch(''); setViewForm({});
      loadPatients();
    } catch (e: any) { showAlert('error', e.response?.data?.detail || 'Update failed'); }
  };

  const addPatient = async () => {
    if (!addForm.pFirst || !addForm.pPhone) return showAlert('error', 'First Name and Phone are required');
    try {
      const vitals = buildVitalsString('p', addForm);
      await patientService.create({
        first_name: addForm.pFirst, last_name: addForm.pLast || undefined,
        email: addForm.pEmail || undefined, phone: addForm.pPhone,
        gender: addForm.pGender || undefined,
        date_of_birth: addForm.pDob ? addForm.pDob + 'T00:00:00' : undefined,
        address: addForm.pAddress || undefined, city: addForm.pCity || undefined,
        emergency_phone: addForm.pWhatsapp || undefined,
        medical_history: vitals || undefined,
      });
      showAlert('success', 'Patient added successfully!');
      setAddForm(emptyAdd);
      setTab(1);
      loadPatients();
    } catch (e: any) { showAlert('error', e.response?.data?.detail || 'Failed to add patient'); }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 3 }}>
        {alert && <Alert severity={alert.type} sx={{ mb: 2 }}>{alert.msg}</Alert>}

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="New Enrollment" />
          <Tab label="Existing Enrollment" />
        </Tabs>

        {tab === 1 && (
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
            <Box sx={{ position: 'relative', mb: 2 }} ref={dropdownRef}>
              <TextField
                fullWidth label="Search Patient (by name or phone)"
                placeholder="Type name or phone number..."
                value={search} size="small"
                onChange={e => { setSearch(e.target.value); setShowDropdown(true); if (!e.target.value) { setSelectedPatient(null); setViewForm({}); } }}
                onFocus={() => search && setShowDropdown(true)}
              />
              {showDropdown && search.trim() && (
                <Paper elevation={3} sx={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, maxHeight: 200, overflowY: 'auto' }}>
                  {filteredPatients.length === 0
                    ? <Box sx={{ p: 1.5, color: 'text.secondary', fontSize: 14 }}>No patients found</Box>
                    : filteredPatients.map(p => (
                      <Box key={p.id} onClick={() => selectPatient(p)}
                        sx={{ p: 1.5, cursor: 'pointer', borderBottom: '1px solid #eee', '&:hover': { background: '#f0f7ff' }, fontSize: 14 }}>
                        <strong>{p.first_name} {p.last_name || ''}</strong> — {p.phone}
                      </Box>
                    ))}
                </Paper>
              )}
            </Box>

            {selectedPatient && (
              <>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <TextField size="small" label="First Name *" value={viewForm.vFirst || ''} onChange={e => handleViewChange('vFirst', e.target.value)} />
                  <TextField size="small" label="Last Name" value={viewForm.vLast || ''} onChange={e => handleViewChange('vLast', e.target.value)} />
                  <TextField size="small" label="Email" type="email" value={viewForm.vEmail || ''} onChange={e => handleViewChange('vEmail', e.target.value)} />
                  <TextField size="small" label="Phone *" value={viewForm.vPhone || ''} onChange={e => handleViewChange('vPhone', e.target.value)} />
                  <FormControl size="small">
                    <InputLabel>Gender</InputLabel>
                    <Select label="Gender" value={viewForm.vGender || ''} onChange={e => handleViewChange('vGender', e.target.value as string)}>
                      <MenuItem value="">-- Select --</MenuItem>
                      <MenuItem value="Male">Male</MenuItem>
                      <MenuItem value="Female">Female</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField size="small" label="Date of Birth" type="date" InputLabelProps={{ shrink: true }} value={viewForm.vDob || ''} onChange={e => handleViewChange('vDob', e.target.value)} />
                  <TextField size="small" label="Address" value={viewForm.vAddress || ''} onChange={e => handleViewChange('vAddress', e.target.value)} />
                  <TextField size="small" label="City" value={viewForm.vCity || ''} onChange={e => handleViewChange('vCity', e.target.value)} />
                  <TextField size="small" label="WhatsApp Contact" value={viewForm.vWhatsapp || ''} onChange={e => handleViewChange('vWhatsapp', e.target.value)} />
                </Box>
                <VitalsForm prefix="v" values={viewForm} onChange={handleViewChange} />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button variant="contained" onClick={addAppointment}>Add Appointment</Button>
                </Box>
              </>
            )}
          </Paper>
        )}

        {tab === 0 && (
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" mb={2}>New Enrollment</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <TextField size="small" label="First Name *" value={addForm.pFirst} onChange={e => handleAddChange('pFirst', e.target.value)} />
              <TextField size="small" label="Last Name" value={addForm.pLast} onChange={e => handleAddChange('pLast', e.target.value)} />
              <TextField size="small" label="Email" type="email" value={addForm.pEmail} onChange={e => handleAddChange('pEmail', e.target.value)} />
              <TextField size="small" label="Phone *" value={addForm.pPhone} onChange={e => handleAddChange('pPhone', e.target.value)} />
              <FormControl size="small">
                <InputLabel>Gender</InputLabel>
                <Select label="Gender" value={addForm.pGender} onChange={e => handleAddChange('pGender', e.target.value as string)}>
                  <MenuItem value="">-- Select --</MenuItem>
                  <MenuItem value="Male">Male</MenuItem>
                  <MenuItem value="Female">Female</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
              <TextField size="small" label="Date of Birth" type="date" InputLabelProps={{ shrink: true }} value={addForm.pDob} onChange={e => handleAddChange('pDob', e.target.value)} />
              <TextField size="small" label="Address" value={addForm.pAddress} onChange={e => handleAddChange('pAddress', e.target.value)} />
              <TextField size="small" label="City" value={addForm.pCity} onChange={e => handleAddChange('pCity', e.target.value)} />
              <TextField size="small" label="WhatsApp Contact" value={addForm.pWhatsapp} onChange={e => handleAddChange('pWhatsapp', e.target.value)} />
            </Box>
            <VitalsForm prefix="p" values={addForm} onChange={handleAddChange} />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
              <Button variant="outlined" onClick={() => setAddForm(emptyAdd)}>Clear</Button>
              <Button variant="contained" onClick={addPatient}>Add Patient</Button>
            </Box>
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default Patients;
