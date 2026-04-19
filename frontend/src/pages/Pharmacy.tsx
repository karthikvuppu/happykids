import React, { useState, useEffect, useRef } from 'react'
import {
  Container, Box, Paper, Typography, TextField, Button, Alert,
  Grid, Tab, Tabs, Table, TableBody, TableCell, TableHead, TableRow,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  Select, MenuItem, FormControl, InputLabel, IconButton, Tooltip,
  Divider, Badge, LinearProgress
} from '@mui/material'
import * as XLSX from 'xlsx'
import api from '../services/api'
import { patientService } from '../services/api'
import { Patient } from '../types'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Drug {
  id: number; name: string; generic_name: string; category: string
  formulation: string; strength: string; unit: string
  price_per_unit: number; stock_quantity: number; reorder_level: number
  batch_number: string; expiry_date: string | null
}
interface RxItem {
  id: number; drug_id: number; drug_name: string; formulation: string
  strength: string; unit: string; price_per_unit: number
  dose: string; frequency: string; duration_days: number
  quantity_prescribed: number; quantity_dispensed: number; item_status: string
}
interface Prescription {
  id: number; patient_id: number; patient_name: string
  prescribed_by: string; diagnosis: string; status: string
  created_at: string; items: RxItem[]
  bill: { id: number; subtotal: number; discount: number; total: number; payment_status: string; payment_mode: string } | null
}
interface Stats { total_drugs: number; low_stock_count: number; pending_prescriptions: number; pending_bills: number; pending_revenue: number; expiring_soon: number }

const FREQUENCIES = ['OD', 'BD', 'TID', 'QID', 'SOS', 'HS', 'Stat']
const CATEGORIES = ['Antibiotic', 'Analgesic', 'Antipyretic', 'Antacid', 'Vitamin', 'Antihistamine', 'Steroid', 'Bronchodilator', 'Antifungal', 'Antiviral', 'ORS', 'Other']
const FORMULATIONS = ['Tablet', 'Syrup', 'Injection', 'Drops', 'Cream', 'Inhaler', 'Sachet', 'Capsule']
const UNITS = ['tablet', 'capsule', 'ml', 'mg', 'vial', 'sachet', 'drops', 'puff', 'strip', 'patch', 'g', 'unit']
const FORMULATION_UNIT_MAP: Record<string, string> = {
  Tablet: 'tablet', Capsule: 'capsule', Syrup: 'ml', Injection: 'ml',
  Drops: 'drops', Cream: 'g', Inhaler: 'puff', Sachet: 'sachet',
}
const PAYMENT_MODES = ['Cash', 'Card', 'UPI', 'Insurance']

function statusColor(s: string): 'default' | 'warning' | 'success' | 'error' {
  if (s === 'dispensed' || s === 'paid') return 'success'
  if (s === 'partial') return 'warning'
  if (s === 'pending') return 'error'
  return 'default'
}

// ─── Bill Print Component ─────────────────────────────────────────────────────
const BillPrint = React.forwardRef<HTMLDivElement, { rx: Prescription; patientName: string }>(({ rx, patientName }, ref) => (
  <div ref={ref} style={{ padding: 24, fontFamily: 'Arial', fontSize: 13 }}>
    <div style={{ textAlign: 'center', marginBottom: 16 }}>
      <h2 style={{ margin: 0 }}>HappyKids Hospital</h2>
      <p style={{ margin: 0 }}>Pharmacy Bill</p>
    </div>
    <Divider />
    <Grid container spacing={1} sx={{ my: 1 }}>
      <Grid item xs={6}><b>Patient:</b> {patientName}</Grid>
      <Grid item xs={6}><b>Bill #:</b> {rx.bill?.id}</Grid>
      <Grid item xs={6}><b>Doctor:</b> {rx.prescribed_by || '—'}</Grid>
      <Grid item xs={6}><b>Date:</b> {new Date(rx.created_at).toLocaleDateString()}</Grid>
    </Grid>
    <Divider />
    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
      <thead>
        <tr style={{ background: '#f5f5f5' }}>
          {['Medicine', 'Dose', 'Freq', 'Days', 'Qty', 'Rate', 'Amount'].map(h => (
            <th key={h} style={{ border: '1px solid #ddd', padding: 4, textAlign: 'left' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rx.items.filter(i => i.item_status === 'dispensed').map(item => (
          <tr key={item.id}>
            <td style={{ border: '1px solid #ddd', padding: 4 }}>{item.drug_name} {item.strength}</td>
            <td style={{ border: '1px solid #ddd', padding: 4 }}>{item.dose}</td>
            <td style={{ border: '1px solid #ddd', padding: 4 }}>{item.frequency}</td>
            <td style={{ border: '1px solid #ddd', padding: 4 }}>{item.duration_days}</td>
            <td style={{ border: '1px solid #ddd', padding: 4 }}>{item.quantity_dispensed} {item.unit}</td>
            <td style={{ border: '1px solid #ddd', padding: 4 }}>₹{item.price_per_unit}</td>
            <td style={{ border: '1px solid #ddd', padding: 4 }}>₹{(item.quantity_dispensed * item.price_per_unit).toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <Box sx={{ mt: 1, textAlign: 'right' }}>
      <p>Subtotal: ₹{rx.bill?.subtotal.toFixed(2)}</p>
      {rx.bill?.discount ? <p>Discount: ₹{rx.bill.discount.toFixed(2)}</p> : null}
      <p><b>Total: ₹{rx.bill?.total.toFixed(2)}</b></p>
      <p>Status: {rx.bill?.payment_status?.toUpperCase()} {rx.bill?.payment_mode ? `(${rx.bill.payment_mode})` : ''}</p>
    </Box>
    <Divider sx={{ mt: 2 }} />
    <p style={{ textAlign: 'center', fontSize: 11, marginTop: 8 }}>Thank you — HappyKids Hospital</p>
  </div>
))

// ─── Main Component ───────────────────────────────────────────────────────────
const Pharmacy: React.FC = () => {
  const [tab, setTab] = useState(0)
  const [stats, setStats] = useState<Stats>({ total_drugs: 0, low_stock_count: 0, pending_prescriptions: 0, pending_bills: 0, pending_revenue: 0, expiring_soon: 0 })
  const [expiringDrugs, setExpiringDrugs] = useState<Drug[]>([])
  const [drugs, setDrugs] = useState<Drug[]>([])
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  // Drug form
  const [drugDialog, setDrugDialog] = useState(false)
  const [editDrug, setEditDrug] = useState<Drug | null>(null)
  const [drugForm, setDrugForm] = useState({ name: '', generic_name: '', category: '', formulation: '', strength: '', unit: 'tablet', price_per_unit: '', stock_quantity: '', reorder_level: '10', batch_number: '', expiry_date: '' })

  // Prescription form
  const [rxDialog, setRxDialog] = useState(false)
  const [rxForm, setRxForm] = useState({ patient_id: '', prescribed_by: '', diagnosis: '', notes: '' })
  const [rxItems, setRxItems] = useState<{ drug_id: string; dose: string; frequency: string; duration_days: string; quantity_prescribed: string }[]>([])

  // Dispense dialog
  const [dispenseDialog, setDispenseDialog] = useState(false)
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null)
  const [dispenseQtys, setDispenseQtys] = useState<Record<number, string>>({})
  const [discount, setDiscount] = useState('0')
  const [payMode, setPayMode] = useState('Cash')

  // Bill print
  const [printRx, setPrintRx] = useState<Prescription | null>(null)
  const [printDialog, setPrintDialog] = useState(false)

  // Bill filters
  const [billFilter, setBillFilter] = useState<'today'|'week'|'month'|'all'>('all')
  const [billMonth, setBillMonth] = useState(() => {
    const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`
  })

  // Stock update
  const [stockDialog, setStockDialog] = useState(false)
  const [stockDrug, setStockDrug] = useState<Drug | null>(null)
  const [stockQty, setStockQty] = useState('')

  // Excel import
  const xlsxInputRef = useRef<HTMLInputElement>(null)
  const [importDialog, setImportDialog] = useState(false)
  const [importRows, setImportRows] = useState<any[]>([])
  const [importProgress, setImportProgress] = useState(0)
  const [importing, setImporting] = useState(false)

  const showAlert = (type: 'success' | 'error', msg: string) => {
    setAlert({ type, msg }); setTimeout(() => setAlert(null), 4000)
  }

  const loadAll = async () => {
    const [s, d, p, pts, exp] = await Promise.all([
      api.get('/api/v1/pharmacy/stats').then(r => r.data),
      api.get('/api/v1/pharmacy/drugs').then(r => r.data),
      api.get('/api/v1/pharmacy/prescriptions').then(r => r.data),
      patientService.getAll().then(r => r.data),
      api.get('/api/v1/pharmacy/drugs/expiring?days=90').then(r => r.data),
    ])
    setStats({ ...s, expiring_soon: exp.length })
    setDrugs(d); setPrescriptions(p); setPatients(pts); setExpiringDrugs(exp)
  }

  useEffect(() => { loadAll() }, [])

  // ── Drug CRUD ──
  const openAddDrug = () => { setEditDrug(null); setDrugForm({ name: '', generic_name: '', category: '', formulation: '', strength: '', unit: 'tablet', price_per_unit: '', stock_quantity: '', reorder_level: '10', batch_number: '', expiry_date: '' }); setDrugDialog(true) }
  const openEditDrug = (d: Drug) => {
    setEditDrug(d)
    setDrugForm({
      name: d.name, generic_name: d.generic_name || '', category: d.category || '',
      formulation: d.formulation || '', strength: d.strength || '', unit: d.unit || 'tablet',
      price_per_unit: String(d.price_per_unit), stock_quantity: String(d.stock_quantity),
      reorder_level: String(d.reorder_level), batch_number: d.batch_number || '',
      expiry_date: d.expiry_date ? d.expiry_date.split('T')[0] : ''
    })
    setDrugDialog(true)
  }

  const saveDrug = async () => {
    const payload = {
      ...drugForm,
      price_per_unit: parseFloat(drugForm.price_per_unit) || 0,
      stock_quantity: parseFloat(drugForm.stock_quantity) || 0,
      reorder_level: parseFloat(drugForm.reorder_level) || 10,
      batch_number: drugForm.batch_number || null,
      expiry_date: drugForm.expiry_date ? new Date(drugForm.expiry_date).toISOString() : null,
    }
    try {
      if (editDrug) await api.put(`/api/v1/pharmacy/drugs/${editDrug.id}`, payload)
      else await api.post('/api/v1/pharmacy/drugs', payload)
      setDrugDialog(false); await loadAll(); showAlert('success', editDrug ? 'Drug updated' : 'Drug added')
    } catch (e: any) { showAlert('error', e.response?.data?.detail || 'Error saving drug') }
  }

  const deleteDrug = async (id: number) => {
    await api.delete(`/api/v1/pharmacy/drugs/${id}`); await loadAll(); showAlert('success', 'Drug removed')
  }

  const saveStock = async () => {
    if (!stockDrug) return
    await api.patch(`/api/v1/pharmacy/drugs/${stockDrug.id}/stock`, { quantity: parseFloat(stockQty), operation: 'add' })
    setStockDialog(false); await loadAll(); showAlert('success', 'Stock updated')
  }

  // ── Excel Import ──
  const handleExcelFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })
      // Normalise column names (case-insensitive, trim spaces)
      const norm = rows.map(row => {
        const out: any = {}
        Object.keys(row).forEach(k => { out[k.toLowerCase().trim().replace(/[\s/]/g, '_')] = row[k] })
        return out
      })
      // Map to drug fields
      const mapped = norm.map(r => {
        const expiryRaw = r.expiry_date || r.expiry || r.exp_date || r.exp || ''
        let expiry_date: string | null = null
        if (expiryRaw) {
          // Handle Excel serial numbers and string dates
          if (typeof expiryRaw === 'number') {
            expiry_date = new Date((expiryRaw - 25569) * 86400000).toISOString()
          } else {
            const d = new Date(expiryRaw)
            if (!isNaN(d.getTime())) expiry_date = d.toISOString()
          }
        }
        return {
          name: r.name || r.drug_name || r.medicine || r.medicine_name || '',
          generic_name: r.generic_name || r.generic || '',
          category: r.category || '',
          formulation: r.formulation || r.form || '',
          strength: r.strength || '',
          unit: r.unit || 'tablet',
          price_per_unit: parseFloat(r.price_per_unit || r.price || r.rate || 0) || 0,
          stock_quantity: parseFloat(r.stock_quantity || r.stock || r.opening_stock || 0) || 0,
          reorder_level: parseFloat(r.reorder_level || r.reorder || 10) || 10,
          batch_number: String(r.batch_number || r.batch || r.batch_no || ''),
          expiry_date,
        }
      }).filter(r => r.name)
      setImportRows(mapped)
      setImportDialog(true)
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  const runImport = async () => {
    setImporting(true)
    setImportProgress(0)
    let done = 0
    for (const row of importRows) {
      try { await api.post('/api/v1/pharmacy/drugs', row) } catch (_) {}
      done++
      setImportProgress(Math.round((done / importRows.length) * 100))
    }
    setImporting(false)
    setImportDialog(false)
    setImportRows([])
    await loadAll()
    showAlert('success', `Imported ${done} drugs successfully`)
  }

  const downloadTemplate = async () => {
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Drug Import')

    ws.columns = [
      { header: 'name',           key: 'name',           width: 22 },
      { header: 'generic_name',   key: 'generic_name',   width: 24 },
      { header: 'category',       key: 'category',       width: 16 },
      { header: 'formulation',    key: 'formulation',    width: 14 },
      { header: 'strength',       key: 'strength',       width: 14 },
      { header: 'unit',           key: 'unit',           width: 12 },
      { header: 'price_per_unit', key: 'price_per_unit', width: 14 },
      { header: 'stock_quantity', key: 'stock_quantity', width: 14 },
      { header: 'reorder_level',  key: 'reorder_level',  width: 14 },
      { header: 'batch_number',   key: 'batch_number',   width: 14 },
      { header: 'expiry_date',    key: 'expiry_date',    width: 14 },
    ]

    // Bold blue header row
    ws.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } }
      cell.alignment = { horizontal: 'center' }
    })

    // Example data row
    ws.addRow(['Amoxicillin','Amoxicillin Trihydrate','Antibiotic','Syrup','125mg/5ml','ml',12.5,500,50,'BATCH001','2026-12-31'])

    // Dropdown validations on data rows (C, D, F columns)
    const catFormula   = `"${CATEGORIES.join(',')}"`
    const formFormula  = `"${FORMULATIONS.join(',')}"`
    const unitFormula  = `"${UNITS.join(',')}"`

    for (let row = 2; row <= 500; row++) {
      ws.getCell(`C${row}`).dataValidation = {
        type: 'list', allowBlank: true, formulae: [catFormula],
        showErrorMessage: true, errorStyle: 'stop',
        errorTitle: 'Invalid Category', error: `Select from: ${CATEGORIES.join(', ')}`,
      }
      ws.getCell(`D${row}`).dataValidation = {
        type: 'list', allowBlank: true, formulae: [formFormula],
        showErrorMessage: true, errorStyle: 'stop',
        errorTitle: 'Invalid Formulation', error: `Select from: ${FORMULATIONS.join(', ')}`,
      }
      ws.getCell(`F${row}`).dataValidation = {
        type: 'list', allowBlank: true, formulae: [unitFormula],
        showErrorMessage: true, errorStyle: 'stop',
        errorTitle: 'Invalid Unit', error: `Select from: ${UNITS.join(', ')}`,
      }
    }

    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'drug_import_template.xlsx'
    document.body.appendChild(a); a.click()
    document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  // ── Prescription ──
  const addRxItem = () => setRxItems(prev => [...prev, { drug_id: '', dose: '', frequency: 'TID', duration_days: '5', quantity_prescribed: '' }])
  const removeRxItem = (i: number) => setRxItems(prev => prev.filter((_, idx) => idx !== i))
  const updateRxItem = (i: number, field: string, val: string) => setRxItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item))

  const saveRx = async () => {
    if (!rxForm.patient_id) return showAlert('error', 'Select a patient')
    if (rxItems.length === 0) return showAlert('error', 'Add at least one drug')
    const payload = {
      patient_id: parseInt(rxForm.patient_id),
      prescribed_by: rxForm.prescribed_by,
      diagnosis: rxForm.diagnosis,
      notes: rxForm.notes,
      items: rxItems.map(i => ({ drug_id: parseInt(i.drug_id), dose: i.dose, frequency: i.frequency, duration_days: parseInt(i.duration_days) || 0, quantity_prescribed: parseFloat(i.quantity_prescribed) || 0 }))
    }
    try {
      await api.post('/api/v1/pharmacy/prescriptions', payload)
      setRxDialog(false); setRxItems([]); setRxForm({ patient_id: '', prescribed_by: '', diagnosis: '', notes: '' })
      await loadAll(); showAlert('success', 'Prescription created')
    } catch (e: any) { showAlert('error', e.response?.data?.detail || 'Error') }
  }

  // ── Dispense ──
  const openDispense = (rx: Prescription) => {
    setSelectedRx(rx)
    const qtys: Record<number, string> = {}
    rx.items.forEach(i => { qtys[i.id] = String(i.quantity_prescribed - i.quantity_dispensed) })
    setDispenseQtys(qtys); setDiscount('0'); setPayMode('Cash'); setDispenseDialog(true)
  }

  const submitDispense = async () => {
    if (!selectedRx) return
    const items = selectedRx.items.filter(i => i.item_status !== 'dispensed').map(i => ({ item_id: i.id, quantity_dispensed: parseFloat(dispenseQtys[i.id] || '0') })).filter(i => i.quantity_dispensed > 0)
    try {
      await api.post(`/api/v1/pharmacy/prescriptions/${selectedRx.id}/dispense`, { items, discount: parseFloat(discount) || 0, payment_mode: payMode })
      setDispenseDialog(false); await loadAll(); showAlert('success', 'Dispensed successfully')
    } catch (e: any) { showAlert('error', e.response?.data?.detail || 'Error dispensing') }
  }

  // ── Pay Bill ──
  const payBill = async (billId: number, mode: string) => {
    await api.post(`/api/v1/pharmacy/bills/${billId}/pay`, { payment_mode: mode })
    await loadAll(); showAlert('success', 'Payment recorded')
  }

  // ── Print ──
  const handlePrint = (rx: Prescription) => { setPrintRx(rx); setPrintDialog(true); setTimeout(() => window.print(), 300) }

  const patientName = (id: number) => { const p = patients.find(x => x.id === id); return p ? `${p.first_name} ${p.last_name || ''}`.trim() : `Patient #${id}` }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

      <Typography variant="h5" fontWeight={700} mb={2}>Pharmacy</Typography>

      {alert && <Alert severity={alert.type} sx={{ mb: 2 }} className="no-print">{alert.msg}</Alert>}

      {/* Stats */}
      <Grid container spacing={2} mb={3} className="no-print">
        {[
          { label: 'Total Drugs', value: stats.total_drugs, color: '#1976d2' },
          { label: 'Low Stock', value: stats.low_stock_count, color: stats.low_stock_count > 0 ? '#d32f2f' : '#388e3c' },
          { label: 'Pending Rx', value: stats.pending_prescriptions, color: '#f57c00' },
          { label: 'Pending Bills', value: stats.pending_bills, color: '#7b1fa2' },
          { label: 'Pending Revenue', value: `₹${stats.pending_revenue}`, color: '#0288d1' },
        ].map(s => (
          <Grid item xs={6} md={2.4} key={s.label}>
            <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={700} color={s.color}>{s.value}</Typography>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} className="no-print">
        <Tab label="Dispense" />
        <Tab label={<Badge badgeContent={stats.low_stock_count} color="error">Drug Master</Badge>} />
        <Tab label={<Badge badgeContent={stats.pending_bills} color="warning">Bills</Badge>} />
        <Tab label={<Badge badgeContent={stats.low_stock_count} color="error">Stock</Badge>} />
        <Tab label={<Badge badgeContent={stats.expiring_soon} color="warning">Expiry</Badge>} />
      </Tabs>

      {/* ── TAB 0: DISPENSE ── */}
      {tab === 0 && (
        <Box>
          <Box display="flex" justifyContent="space-between" mb={2}>
            <Typography variant="h6">Prescriptions</Typography>
            <Button variant="contained" onClick={() => { setRxDialog(true); addRxItem() }}>+ New Prescription</Button>
          </Box>
          <Paper elevation={1}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  {['#', 'Patient', 'Doctor', 'Diagnosis', 'Date', 'Status', 'Bill', 'Actions'].map(h => <TableCell key={h}><b>{h}</b></TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {prescriptions.length === 0 && <TableRow><TableCell colSpan={8} align="center">No prescriptions yet</TableCell></TableRow>}
                {prescriptions.map(rx => (
                  <TableRow key={rx.id} hover>
                    <TableCell>{rx.id}</TableCell>
                    <TableCell>{rx.patient_name}</TableCell>
                    <TableCell>{rx.prescribed_by || '—'}</TableCell>
                    <TableCell>{rx.diagnosis || '—'}</TableCell>
                    <TableCell>{new Date(rx.created_at).toLocaleDateString()}</TableCell>
                    <TableCell><Chip size="small" label={rx.status} color={statusColor(rx.status)} /></TableCell>
                    <TableCell>
                      {rx.bill ? <Chip size="small" label={`₹${rx.bill.total} ${rx.bill.payment_status}`} color={statusColor(rx.bill.payment_status)} /> : '—'}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={0.5}>
                        {rx.status !== 'dispensed' && <Button size="small" variant="outlined" onClick={() => openDispense(rx)}>Dispense</Button>}
                        {rx.bill && rx.bill.payment_status === 'pending' && <Button size="small" variant="outlined" color="success" onClick={() => payBill(rx.bill!.id, 'Cash')}>Pay</Button>}
                        {rx.bill && <Button size="small" onClick={() => handlePrint(rx)}>🖨</Button>}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}

      {/* ── TAB 1: DRUG MASTER ── */}
      {tab === 1 && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Drug Master</Typography>
            <Box display="flex" gap={1}>
              <Button variant="outlined" size="small" onClick={downloadTemplate}>⬇ Template</Button>
              <Button variant="outlined" size="small" onClick={() => xlsxInputRef.current?.click()}>📥 Import Excel</Button>
              <input ref={xlsxInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleExcelFile} />
              <Button variant="contained" onClick={openAddDrug}>+ Add Drug</Button>
            </Box>
          </Box>
          <Paper elevation={1}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  {['Name', 'Category', 'Formulation', 'Strength', 'Unit', 'Price/Unit', 'Stock', 'Reorder', 'Batch', 'Expiry', 'Actions'].map(h => <TableCell key={h}><b>{h}</b></TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {drugs.length === 0 && <TableRow><TableCell colSpan={11} align="center">No drugs added yet</TableCell></TableRow>}
                {drugs.map(d => {
                  const expDate = d.expiry_date ? new Date(d.expiry_date) : null
                  const daysToExp = expDate ? Math.ceil((expDate.getTime() - Date.now()) / 86400000) : null
                  const expColor = daysToExp !== null ? (daysToExp < 0 ? '#ffebee' : daysToExp <= 30 ? '#fff3e0' : 'inherit') : 'inherit'
                  return (
                    <TableRow key={d.id} hover sx={{ bgcolor: d.stock_quantity <= d.reorder_level ? '#fff3e0' : expColor }}>
                      <TableCell><b>{d.name}</b>{d.generic_name ? <Typography variant="caption" display="block" color="text.secondary">{d.generic_name}</Typography> : null}</TableCell>
                      <TableCell>{d.category}</TableCell>
                      <TableCell>{d.formulation}</TableCell>
                      <TableCell>{d.strength}</TableCell>
                      <TableCell>{d.unit}</TableCell>
                      <TableCell>₹{d.price_per_unit}</TableCell>
                      <TableCell sx={{ color: d.stock_quantity <= d.reorder_level ? 'error.main' : 'inherit', fontWeight: d.stock_quantity <= d.reorder_level ? 700 : 400 }}>{d.stock_quantity}</TableCell>
                      <TableCell>{d.reorder_level}</TableCell>
                      <TableCell>{d.batch_number || '—'}</TableCell>
                      <TableCell>
                        {expDate ? (
                          <Box>
                            <Typography variant="body2" color={daysToExp !== null && daysToExp < 0 ? 'error' : daysToExp !== null && daysToExp <= 30 ? 'warning.main' : 'inherit'}>
                              {expDate.toLocaleDateString()}
                            </Typography>
                            {daysToExp !== null && daysToExp < 0 && <Chip size="small" label="Expired" color="error" />}
                            {daysToExp !== null && daysToExp >= 0 && daysToExp <= 30 && <Chip size="small" label={`${daysToExp}d left`} color="warning" />}
                          </Box>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={0.5}>
                          <Button size="small" onClick={() => openEditDrug(d)}>Edit</Button>
                          <Button size="small" color="success" onClick={() => { setStockDrug(d); setStockQty(''); setStockDialog(true) }}>+Stock</Button>
                          <Button size="small" color="error" onClick={() => deleteDrug(d.id)}>Del</Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}

      {/* ── TAB 2: BILLS ── */}
      {tab === 2 && (() => {
        const now = new Date()
        const todayStr = now.toDateString()
        const allBills = prescriptions.filter(rx => rx.bill)
        const filtered = allBills.filter(rx => {
          const d = new Date(rx.created_at)
          if (billFilter === 'today') return d.toDateString() === todayStr
          if (billFilter === 'week') return (now.getTime() - d.getTime()) / 86400000 <= 7
          if (billFilter === 'month') return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` === billMonth
          return true
        })
        const totalRevenue = filtered.reduce((s, rx) => s + (rx.bill?.total || 0), 0)
        const paidRevenue  = filtered.filter(rx => rx.bill?.payment_status === 'paid').reduce((s, rx) => s + (rx.bill?.total || 0), 0)
        const pendingAmt   = totalRevenue - paidRevenue
        return (
          <Box>
            <Box display="flex" alignItems="center" gap={1} mb={2} flexWrap="wrap">
              <Typography variant="h6" mr={1}>Bills</Typography>
              {(['today','week','month','all'] as const).map(f => (
                <Chip key={f} label={f === 'today' ? 'Today' : f === 'week' ? 'This Week' : f === 'month' ? 'Month' : 'All Time'}
                  color={billFilter === f ? 'primary' : 'default'} onClick={() => setBillFilter(f)}
                  variant={billFilter === f ? 'filled' : 'outlined'} size="small" sx={{ cursor: 'pointer' }} />
              ))}
              {billFilter === 'month' && (
                <TextField type="month" size="small" value={billMonth} onChange={e => setBillMonth(e.target.value)}
                  sx={{ width: 160 }} InputLabelProps={{ shrink: true }} />
              )}
            </Box>
            <Grid container spacing={2} mb={2}>
              {[
                { label: 'Total Bills', value: filtered.length, color: '#1976d2' },
                { label: 'Total Revenue', value: `₹${totalRevenue.toFixed(2)}`, color: '#388e3c' },
                { label: 'Collected', value: `₹${paidRevenue.toFixed(2)}`, color: '#2e7d32' },
                { label: 'Pending', value: `₹${pendingAmt.toFixed(2)}`, color: pendingAmt > 0 ? '#d32f2f' : '#388e3c' },
              ].map(s => (
                <Grid item xs={6} md={3} key={s.label}>
                  <Paper elevation={2} sx={{ p: 1.5, textAlign: 'center', borderTop: `3px solid ${s.color}` }}>
                    <Typography variant="h6" fontWeight={700} color={s.color}>{s.value}</Typography>
                    <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
            <Paper elevation={1}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    {['Bill#', 'Patient', 'Date', 'Subtotal', 'Discount', 'Total', 'Mode', 'Status', 'Actions'].map(h => <TableCell key={h}><b>{h}</b></TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.length === 0 && <TableRow><TableCell colSpan={9} align="center">No bills for this period</TableCell></TableRow>}
                  {filtered.map(rx => (
                    <TableRow key={rx.bill!.id} hover>
                      <TableCell>{rx.bill!.id}</TableCell>
                      <TableCell>{rx.patient_name}</TableCell>
                      <TableCell>{new Date(rx.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>₹{rx.bill!.subtotal.toFixed(2)}</TableCell>
                      <TableCell>₹{rx.bill!.discount.toFixed(2)}</TableCell>
                      <TableCell><b>₹{rx.bill!.total.toFixed(2)}</b></TableCell>
                      <TableCell>{rx.bill!.payment_mode || '—'}</TableCell>
                      <TableCell><Chip size="small" label={rx.bill!.payment_status} color={statusColor(rx.bill!.payment_status)} /></TableCell>
                      <TableCell>
                        <Box display="flex" gap={0.5}>
                          {rx.bill!.payment_status === 'pending' && (
                            <FormControl size="small" sx={{ minWidth: 80 }}>
                              <Select value="Cash" size="small" onChange={e => payBill(rx.bill!.id, e.target.value as string)}>
                                {PAYMENT_MODES.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                              </Select>
                            </FormControl>
                          )}
                          <Button size="small" onClick={() => handlePrint(rx)}>🖨 Print</Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        )
      })()}

      {/* ── TAB 3: STOCK ── */}
      {tab === 3 && (
        <Box>
          <Typography variant="h6" mb={2}>Stock Status</Typography>
          <Grid container spacing={2}>
            {drugs.map(d => (
              <Grid item xs={12} sm={6} md={4} key={d.id}>
                <Paper elevation={2} sx={{ p: 2, borderLeft: `4px solid ${d.stock_quantity <= d.reorder_level ? '#d32f2f' : '#388e3c'}` }}>
                  <Typography fontWeight={700}>{d.name} {d.strength}</Typography>
                  <Typography variant="caption" color="text.secondary">{d.formulation} · {d.category}</Typography>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                    <Box>
                      <Typography variant="body2">Stock: <b style={{ color: d.stock_quantity <= d.reorder_level ? '#d32f2f' : '#388e3c' }}>{d.stock_quantity} {d.unit}</b></Typography>
                      <Typography variant="caption" color="text.secondary">Reorder at: {d.reorder_level}</Typography>
                    </Box>
                    <Button size="small" variant="outlined" onClick={() => { setStockDrug(d); setStockQty(''); setStockDialog(true) }}>+Stock</Button>
                  </Box>
                  {d.stock_quantity <= d.reorder_level && <Chip size="small" label="Low Stock" color="error" sx={{ mt: 1 }} />}
                </Paper>
              </Grid>
            ))}
            {drugs.length === 0 && <Grid item xs={12}><Typography color="text.secondary" textAlign="center">No drugs in master. Add drugs first.</Typography></Grid>}
          </Grid>
        </Box>
      )}

      {/* ── TAB 4: EXPIRY ── */}
      {tab === 4 && (
        <Box>
          <Typography variant="h6" mb={2}>Expiry Tracker — Next 90 Days</Typography>
          {expiringDrugs.length === 0
            ? <Typography color="text.secondary" textAlign="center">No drugs expiring in the next 90 days</Typography>
            : (
              <Paper elevation={1}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      {['Name', 'Formulation', 'Strength', 'Batch No.', 'Expiry Date', 'Days Left', 'Stock', 'Status'].map(h => <TableCell key={h}><b>{h}</b></TableCell>)}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {expiringDrugs.map(d => {
                      const expDate = d.expiry_date ? new Date(d.expiry_date) : null
                      const daysLeft = expDate ? Math.ceil((expDate.getTime() - Date.now()) / 86400000) : null
                      return (
                        <TableRow key={d.id} sx={{ bgcolor: daysLeft !== null && daysLeft < 0 ? '#ffebee' : daysLeft !== null && daysLeft <= 30 ? '#fff3e0' : '#fffde7' }}>
                          <TableCell><b>{d.name}</b>{d.generic_name ? <Typography variant="caption" display="block" color="text.secondary">{d.generic_name}</Typography> : null}</TableCell>
                          <TableCell>{d.formulation}</TableCell>
                          <TableCell>{d.strength}</TableCell>
                          <TableCell>{d.batch_number || '—'}</TableCell>
                          <TableCell>{expDate?.toLocaleDateString()}</TableCell>
                          <TableCell>
                            {daysLeft !== null && daysLeft < 0
                              ? <Chip size="small" label="Expired" color="error" />
                              : <Typography variant="body2" color={daysLeft !== null && daysLeft <= 30 ? 'warning.main' : 'success.main'}><b>{daysLeft}d</b></Typography>}
                          </TableCell>
                          <TableCell>{d.stock_quantity} {d.unit}</TableCell>
                          <TableCell>
                            {daysLeft !== null && daysLeft < 0 && <Chip size="small" label="Expired" color="error" />}
                            {daysLeft !== null && daysLeft >= 0 && daysLeft <= 30 && <Chip size="small" label="Expiring Soon" color="warning" />}
                            {daysLeft !== null && daysLeft > 30 && <Chip size="small" label="Monitor" color="default" />}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </Paper>
            )}
        </Box>
      )}

      {/* ── DIALOGS ── */}

      {/* Drug Add/Edit */}
      <Dialog open={drugDialog} onClose={() => setDrugDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editDrug ? 'Edit Drug' : 'Add Drug'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={8}><TextField fullWidth label="Drug Name *" value={drugForm.name} onChange={e => setDrugForm(f => ({ ...f, name: e.target.value }))} size="small" /></Grid>
            <Grid item xs={4}><TextField fullWidth label="Strength" value={drugForm.strength} onChange={e => setDrugForm(f => ({ ...f, strength: e.target.value }))} size="small" placeholder="250mg" /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Generic Name" value={drugForm.generic_name} onChange={e => setDrugForm(f => ({ ...f, generic_name: e.target.value }))} size="small" /></Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small"><InputLabel>Category</InputLabel>
                <Select label="Category" value={drugForm.category} onChange={e => setDrugForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small"><InputLabel>Formulation</InputLabel>
                <Select label="Formulation" value={drugForm.formulation} onChange={e => {
                  const form = e.target.value
                  const autoUnit = FORMULATION_UNIT_MAP[form] || drugForm.unit
                  setDrugForm(f => ({ ...f, formulation: form, unit: autoUnit }))
                }}>
                  {FORMULATIONS.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth size="small"><InputLabel>Unit</InputLabel>
                <Select label="Unit" value={drugForm.unit} onChange={e => setDrugForm(f => ({ ...f, unit: e.target.value }))}>
                  {UNITS.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}><TextField fullWidth label="Price/Unit (₹)" type="number" value={drugForm.price_per_unit} onChange={e => setDrugForm(f => ({ ...f, price_per_unit: e.target.value }))} size="small" /></Grid>
            <Grid item xs={4}><TextField fullWidth label="Reorder Level" type="number" value={drugForm.reorder_level} onChange={e => setDrugForm(f => ({ ...f, reorder_level: e.target.value }))} size="small" /></Grid>
            {!editDrug && <Grid item xs={6}><TextField fullWidth label="Opening Stock" type="number" value={drugForm.stock_quantity} onChange={e => setDrugForm(f => ({ ...f, stock_quantity: e.target.value }))} size="small" /></Grid>}
            <Grid item xs={6}><TextField fullWidth label="Batch Number" value={drugForm.batch_number} onChange={e => setDrugForm(f => ({ ...f, batch_number: e.target.value }))} size="small" placeholder="e.g. BATCH001" /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Expiry Date" type="date" value={drugForm.expiry_date} onChange={e => setDrugForm(f => ({ ...f, expiry_date: e.target.value }))} size="small" InputLabelProps={{ shrink: true }} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDrugDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveDrug}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Excel Import Preview */}
      <Dialog open={importDialog} onClose={() => !importing && setImportDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Import Drugs — Preview ({importRows.length} rows)</DialogTitle>
        <DialogContent>
          {importing && <LinearProgress variant="determinate" value={importProgress} sx={{ mb: 2 }} />}
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  {['Name', 'Generic', 'Category', 'Formulation', 'Strength', 'Unit', 'Price', 'Stock', 'Reorder', 'Batch', 'Expiry'].map(h => <TableCell key={h}><b>{h}</b></TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {importRows.slice(0, 20).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.generic_name}</TableCell>
                    <TableCell>{r.category}</TableCell>
                    <TableCell>{r.formulation}</TableCell>
                    <TableCell>{r.strength}</TableCell>
                    <TableCell>{r.unit}</TableCell>
                    <TableCell>₹{r.price_per_unit}</TableCell>
                    <TableCell>{r.stock_quantity}</TableCell>
                    <TableCell>{r.reorder_level}</TableCell>
                    <TableCell>{r.batch_number}</TableCell>
                    <TableCell>{r.expiry_date ? new Date(r.expiry_date).toLocaleDateString() : '—'}</TableCell>
                  </TableRow>
                ))}
                {importRows.length > 20 && <TableRow><TableCell colSpan={11} align="center" sx={{ color: 'text.secondary' }}>... and {importRows.length - 20} more rows</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialog(false)} disabled={importing}>Cancel</Button>
          <Button variant="contained" onClick={runImport} disabled={importing}>
            {importing ? `Uploading... ${importProgress}%` : `Import ${importRows.length} Drugs`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Stock Add */}
      <Dialog open={stockDialog} onClose={() => setStockDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Stock — {stockDrug?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" mb={1}>Current: {stockDrug?.stock_quantity} {stockDrug?.unit}</Typography>
          <TextField fullWidth label="Quantity to Add" type="number" value={stockQty} onChange={e => setStockQty(e.target.value)} size="small" autoFocus />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStockDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveStock}>Add Stock</Button>
        </DialogActions>
      </Dialog>

      {/* New Prescription */}
      <Dialog open={rxDialog} onClose={() => setRxDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>New Prescription</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <FormControl fullWidth size="small"><InputLabel>Patient *</InputLabel>
                <Select label="Patient *" value={rxForm.patient_id} onChange={e => setRxForm(f => ({ ...f, patient_id: e.target.value as string }))}>
                  {patients.map(p => <MenuItem key={p.id} value={p.id}>{p.first_name} {p.last_name || ''}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}><TextField fullWidth label="Doctor Name" value={rxForm.prescribed_by} onChange={e => setRxForm(f => ({ ...f, prescribed_by: e.target.value }))} size="small" /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Diagnosis" value={rxForm.diagnosis} onChange={e => setRxForm(f => ({ ...f, diagnosis: e.target.value }))} size="small" /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Notes" value={rxForm.notes} onChange={e => setRxForm(f => ({ ...f, notes: e.target.value }))} size="small" /></Grid>
          </Grid>
          <Divider sx={{ my: 2 }} />
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography fontWeight={600}>Drugs</Typography>
            <Button size="small" onClick={addRxItem}>+ Add Drug</Button>
          </Box>
          {rxItems.map((item, i) => (
            <Grid container spacing={1} key={i} alignItems="center" sx={{ mb: 1 }}>
              <Grid item xs={3}>
                <FormControl fullWidth size="small"><InputLabel>Drug</InputLabel>
                  <Select label="Drug" value={item.drug_id} onChange={e => updateRxItem(i, 'drug_id', e.target.value as string)}>
                    {drugs.map(d => <MenuItem key={d.id} value={d.id}>{d.name} {d.strength}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={2}><TextField fullWidth label="Dose" value={item.dose} onChange={e => updateRxItem(i, 'dose', e.target.value)} size="small" placeholder="5ml" /></Grid>
              <Grid item xs={2}>
                <FormControl fullWidth size="small"><InputLabel>Freq</InputLabel>
                  <Select label="Freq" value={item.frequency} onChange={e => updateRxItem(i, 'frequency', e.target.value as string)}>
                    {FREQUENCIES.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={2}><TextField fullWidth label="Days" type="number" value={item.duration_days} onChange={e => updateRxItem(i, 'duration_days', e.target.value)} size="small" /></Grid>
              <Grid item xs={2}><TextField fullWidth label="Qty" type="number" value={item.quantity_prescribed} onChange={e => updateRxItem(i, 'quantity_prescribed', e.target.value)} size="small" /></Grid>
              <Grid item xs={1}><Button size="small" color="error" onClick={() => removeRxItem(i)}>✕</Button></Grid>
            </Grid>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setRxDialog(false); setRxItems([]) }}>Cancel</Button>
          <Button variant="contained" onClick={saveRx}>Save Prescription</Button>
        </DialogActions>
      </Dialog>

      {/* Dispense Dialog */}
      <Dialog open={dispenseDialog} onClose={() => setDispenseDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Dispense — {selectedRx?.patient_name}</DialogTitle>
        <DialogContent>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                {['Drug', 'Dose', 'Freq', 'Days', 'Prescribed', 'Dispense Qty', 'Rate', 'Amount'].map(h => <TableCell key={h}><b>{h}</b></TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {selectedRx?.items.map(item => (
                <TableRow key={item.id} sx={{ opacity: item.item_status === 'dispensed' ? 0.5 : 1 }}>
                  <TableCell>{item.drug_name} {item.strength}</TableCell>
                  <TableCell>{item.dose}</TableCell>
                  <TableCell>{item.frequency}</TableCell>
                  <TableCell>{item.duration_days}d</TableCell>
                  <TableCell>{item.quantity_prescribed} {item.unit}</TableCell>
                  <TableCell>
                    {item.item_status === 'dispensed'
                      ? <Chip size="small" label="Dispensed" color="success" />
                      : <TextField size="small" type="number" value={dispenseQtys[item.id] || ''} onChange={e => setDispenseQtys(prev => ({ ...prev, [item.id]: e.target.value }))} sx={{ width: 80 }} />}
                  </TableCell>
                  <TableCell>₹{item.price_per_unit}</TableCell>
                  <TableCell>₹{((parseFloat(dispenseQtys[item.id] || '0')) * item.price_per_unit).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={4}><TextField fullWidth label="Discount (₹)" type="number" value={discount} onChange={e => setDiscount(e.target.value)} size="small" /></Grid>
            <Grid item xs={4}>
              <FormControl fullWidth size="small"><InputLabel>Payment Mode</InputLabel>
                <Select label="Payment Mode" value={payMode} onChange={e => setPayMode(e.target.value as string)}>
                  {PAYMENT_MODES.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDispenseDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitDispense}>Dispense & Generate Bill</Button>
        </DialogActions>
      </Dialog>

      {/* Print Bill (hidden, only shown on print) */}
      {printRx && (
        <Box sx={{ display: 'none' }} className="print-only">
          <BillPrint ref={printRef} rx={printRx} patientName={patientName(printRx.patient_id)} />
        </Box>
      )}
    </Container>
  )
}

export default Pharmacy
