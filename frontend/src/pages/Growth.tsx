import React, { useState, useEffect, useRef } from 'react'
import {
  Container, Box, Paper, Typography, TextField, Button, MenuItem,
  Select, FormControl, InputLabel, Grid, Alert, Divider, Chip
} from '@mui/material'
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { patientService } from '../services/api'
import { Patient } from '../types'
import {
  WHO_WEIGHT_BOYS, WHO_WEIGHT_GIRLS,
  WHO_HEIGHT_BOYS, WHO_HEIGHT_GIRLS,
  WHO_HC_BOYS, WHO_HC_GIRLS,
  WHO_BMI_BOYS, WHO_BMI_GIRLS,
  getDataForGender, WHOPoint
} from '../data/whoData'

interface Visit { date: string; ageMonths: number; weight: number | null; height: number | null; hc: number | null; bmi: number | null }

const PERCENTILE_COLORS = { p3: '#ef9a9a', p15: '#ffcc80', p50: '#81c784', p85: '#ffcc80', p97: '#ef9a9a' }
const PERCENTILE_DASH = { p3: '4 4', p15: '2 2', p50: '0', p85: '2 2', p97: '4 4' }

function calcAgeMonths(dob: string): number {
  const birth = new Date(dob)
  const now = new Date()
  return Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
}

function calcBMI(weight: number, height: number): number {
  return parseFloat((weight / ((height / 100) ** 2)).toFixed(1))
}

function parseVisits(history: string, dob: string): Visit[] {
  if (!history || !dob) return []
  const visits: Visit[] = []
  const blocks = history.split('\n---\n')
  blocks.forEach(block => {
    const dateMatch = block.match(/Date:\s*(.+)/)
    const weightMatch = block.match(/Weight:\s*([\d.]+)/)
    const heightMatch = block.match(/Height:\s*([\d.]+)/)
    const hcMatch = block.match(/HC:\s*([\d.]+)/)
    if (!dateMatch) return
    const date = dateMatch[1].trim()
    const weight = weightMatch ? parseFloat(weightMatch[1]) : null
    const height = heightMatch ? parseFloat(heightMatch[1]) : null
    const hc = hcMatch ? parseFloat(hcMatch[1]) : null
    const birth = new Date(dob)
    const visitDate = new Date(date)
    const ageMonths = Math.floor((visitDate.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
    const bmi = weight && height ? calcBMI(weight, height) : null
    if (ageMonths >= 0) visits.push({ date, ageMonths, weight, height, hc, bmi })
  })
  return visits.sort((a, b) => a.ageMonths - b.ageMonths)
}

function buildChartData(whoData: WHOPoint[], visits: Visit[], metric: keyof Visit) {
  const patientByAge: Record<number, number> = {}
  visits.forEach(v => { if (v[metric] != null) patientByAge[v.ageMonths] = v[metric] as number })
  return whoData.map(pt => ({
    age: pt.age,
    p3: pt.p3, p15: pt.p15, p50: pt.p50, p85: pt.p85, p97: pt.p97,
    patient: patientByAge[pt.age] ?? null,
  }))
}

interface ChartProps {
  title: string
  data: any[]
  unit: string
  domain: [number, number]
  ageMax: number
  currentAge: number
  currentValue: number | null
}

const GrowthChartPanel: React.FC<ChartProps> = ({ title, data, unit, domain, ageMax, currentAge, currentValue }) => {
  const filtered = data.filter(d => d.age <= ageMax)
  // inject current visit value at current age for display
  const chartData = filtered.map(d => d.age === currentAge && currentValue ? { ...d, patient: currentValue } : d)
  // if no exact match, add a point
  const hasCurrentAge = chartData.some(d => d.age === currentAge)
  const displayData = !hasCurrentAge && currentValue
    ? [...chartData, { age: currentAge, patient: currentValue, p3: null, p15: null, p50: null, p85: null, p97: null }].sort((a, b) => a.age - b.age)
    : chartData

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 3 }} className="chart-panel">
      <Typography variant="subtitle1" fontWeight={700} mb={1}>{title}</Typography>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={displayData} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="age" label={{ value: 'Age (months)', position: 'insideBottom', offset: -10 }} type="number" domain={[0, ageMax]} tickCount={10} />
          <YAxis label={{ value: unit, angle: -90, position: 'insideLeft' }} domain={domain} />
          <Tooltip formatter={(v: any) => [v != null ? `${v} ${unit}` : '--']} labelFormatter={(l: any) => `Age: ${l} months`} />
          <Legend verticalAlign="top" />
          {(['p97','p85','p50','p15','p3'] as const).map(p => (
            <Line key={p} type="monotone" dataKey={p} stroke={PERCENTILE_COLORS[p]} strokeDasharray={PERCENTILE_DASH[p]}
              dot={false} strokeWidth={p === 'p50' ? 2 : 1} connectNulls name={`${p.toUpperCase()}`} />
          ))}
          <Line type="monotone" dataKey="patient" stroke="#1565c0" strokeWidth={2.5}
            dot={{ fill: '#1565c0', r: 5 }} activeDot={{ r: 7 }} connectNulls name="Patient" />
          {currentAge > 0 && <ReferenceLine x={currentAge} stroke="#1565c0" strokeDasharray="4 4" />}
        </ComposedChart>
      </ResponsiveContainer>
    </Paper>
  )
}

const Growth: React.FC = () => {
  const printRef = useRef<HTMLDivElement>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedId, setSelectedId] = useState<number | ''>('')
  const [patient, setPatient] = useState<Patient | null>(null)
  const [form, setForm] = useState({ weight: '', height: '', hc: '' })
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [visits, setVisits] = useState<Visit[]>([])

  useEffect(() => { patientService.getAll().then(r => setPatients(r.data)) }, [])

  useEffect(() => {
    if (!selectedId) { setPatient(null); setVisits([]); return }
    const p = patients.find(x => x.id === selectedId)
    if (p) { setPatient(p); setVisits(parseVisits(p.medical_history || '', p.date_of_birth || '')) }
  }, [selectedId, patients])

  const ageMonths = patient?.date_of_birth ? calcAgeMonths(patient.date_of_birth) : 0
  const ageYears = (ageMonths / 12).toFixed(1)
  const weight = parseFloat(form.weight) || null
  const height = parseFloat(form.height) || null
  const hc = parseFloat(form.hc) || null
  const bmi = weight && height ? calcBMI(weight, height) : null
  const gender = patient?.gender || 'M'

  const handleSave = async () => {
    if (!patient || !weight) return setAlert({ type: 'error', msg: 'Select patient and enter weight at minimum' })
    const dateStr = new Date().toISOString().split('T')[0]
    const entry = `\n---\nDate: ${dateStr}\nWeight: ${weight}\n${height ? `Height: ${height}\n` : ''}${hc ? `HC: ${hc}\n` : ''}${bmi ? `BMI: ${bmi}\n` : ''}`
    const updated = (patient.medical_history || '') + entry
    await patientService.update(patient.id, { ...patient, medical_history: updated })
    setVisits(parseVisits(updated, patient.date_of_birth || ''))
    setPatient({ ...patient, medical_history: updated })
    setAlert({ type: 'success', msg: 'Measurements saved!' })
    setTimeout(() => setAlert(null), 3000)
  }

  const handlePrint = () => window.print()

  // chart data
  const weightData = buildChartData(getDataForGender(WHO_WEIGHT_BOYS, WHO_WEIGHT_GIRLS, gender), visits, 'weight')
  const heightData = buildChartData(getDataForGender(WHO_HEIGHT_BOYS, WHO_HEIGHT_GIRLS, gender), visits, 'height')
  const hcData = buildChartData(getDataForGender(WHO_HC_BOYS, WHO_HC_GIRLS, gender), visits, 'hc')
  const bmiData = buildChartData(getDataForGender(WHO_BMI_BOYS, WHO_BMI_GIRLS, gender), visits, 'bmi')

  const showHC = ageMonths <= 60
  const showWeight = ageMonths <= 120
  const showHeight = ageMonths <= 228
  const showBMI = ageMonths >= 0

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <style>{`@media print { .no-print { display: none !important; } body { font-size: 12px; } }`}</style>

      <Typography variant="h5" fontWeight={700} mb={2}>WHO Growth Charts</Typography>

      {/* Controls — hidden on print */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }} className="no-print">
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Select Patient</InputLabel>
              <Select value={selectedId} label="Select Patient" onChange={e => setSelectedId(e.target.value as number)}>
                {patients.map(p => (
                  <MenuItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {patient && (
            <>
              <Grid item xs={6} md={2}>
                <Typography variant="body2" color="text.secondary">Age</Typography>
                <Typography fontWeight={600}>{ageYears} years ({ageMonths} months)</Typography>
              </Grid>
              <Grid item xs={6} md={2}>
                <Typography variant="body2" color="text.secondary">Gender</Typography>
                <Typography fontWeight={600}>{gender === 'F' ? 'Female' : 'Male'}</Typography>
              </Grid>
            </>
          )}
        </Grid>

        {patient && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography fontWeight={600} mb={1}>Enter Today's Measurements</Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={6} md={2}>
                <TextField fullWidth label="Weight (kg)" value={form.weight}
                  onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} type="number" size="small" />
              </Grid>
              <Grid item xs={6} md={2}>
                <TextField fullWidth label="Height (cm)" value={form.height}
                  onChange={e => setForm(f => ({ ...f, height: e.target.value }))} type="number" size="small" />
              </Grid>
              {showHC && (
                <Grid item xs={6} md={2}>
                  <TextField fullWidth label="Head Circumference (cm)" value={form.hc}
                    onChange={e => setForm(f => ({ ...f, hc: e.target.value }))} type="number" size="small" />
                </Grid>
              )}
              {bmi && (
                <Grid item xs={6} md={2}>
                  <Paper variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">BMI</Typography>
                    <Typography variant="h6" fontWeight={700} color={bmi > 25 ? 'error' : bmi < 14 ? 'warning.main' : 'success.main'}>{bmi}</Typography>
                  </Paper>
                </Grid>
              )}
              <Grid item xs={12} md={4} sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" onClick={handleSave}>Save Visit</Button>
                <Button variant="outlined" onClick={handlePrint}>🖨 Print Charts</Button>
              </Grid>
            </Grid>
            {alert && <Alert severity={alert.type} sx={{ mt: 2 }}>{alert.msg}</Alert>}

            {visits.length > 0 && (
              <Box mt={2}>
                <Typography variant="body2" fontWeight={600} mb={1}>Visit History</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {visits.map((v, i) => (
                    <Chip key={i} size="small" label={`${v.date} | ${v.ageMonths}m | ${v.weight ?? '--'}kg | ${v.height ?? '--'}cm`} variant="outlined" />
                  ))}
                </Box>
              </Box>
            )}
          </>
        )}
      </Paper>

      {/* Patient header on print */}
      <Box sx={{ display: 'none' }} className="print-header">
        {patient && <Typography variant="h6">Patient: {patient.first_name} {patient.last_name} | Age: {ageYears} years | Gender: {gender === 'F' ? 'Female' : 'Male'}</Typography>}
      </Box>

      {patient && (
        <Box ref={printRef}>
          <Typography variant="body2" color="text.secondary" mb={2} className="no-print">
            Showing WHO {gender === 'F' ? 'Girls' : 'Boys'} reference curves. Blue line = patient measurements across visits.
          </Typography>

          <Grid container spacing={2}>
            {showWeight && (
              <Grid item xs={12} md={6}>
                <GrowthChartPanel title="Weight for Age" data={weightData} unit="kg"
                  domain={[0, 80]} ageMax={120} currentAge={ageMonths} currentValue={weight} />
              </Grid>
            )}
            {showHeight && (
              <Grid item xs={12} md={6}>
                <GrowthChartPanel title="Height / Length for Age" data={heightData} unit="cm"
                  domain={[40, 200]} ageMax={228} currentAge={ageMonths} currentValue={height} />
              </Grid>
            )}
            {showHC && (
              <Grid item xs={12} md={6}>
                <GrowthChartPanel title="Head Circumference for Age (0–5 years only)" data={hcData} unit="cm"
                  domain={[28, 58]} ageMax={60} currentAge={ageMonths} currentValue={hc} />
              </Grid>
            )}
            {showBMI && (
              <Grid item xs={12} md={6}>
                <GrowthChartPanel title="BMI for Age" data={bmiData} unit="kg/m²"
                  domain={[8, 40]} ageMax={228} currentAge={ageMonths} currentValue={bmi} />
              </Grid>
            )}
          </Grid>

          {!showHC && ageMonths > 60 && (
            <Typography variant="caption" color="text.secondary">
              Head circumference chart not shown — WHO standard applies only for 0–5 years.
            </Typography>
          )}
        </Box>
      )}

      {!patient && (
        <Paper sx={{ p: 6, textAlign: 'center' }} variant="outlined">
          <Typography color="text.secondary">Select a patient to view growth charts</Typography>
        </Paper>
      )}
    </Container>
  )
}

export default Growth
