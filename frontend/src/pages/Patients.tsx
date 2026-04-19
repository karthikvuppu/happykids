import React from 'react';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { patientService } from '../services/api';
import { Patient } from '../types';

const Patients: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<Partial<Patient>>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const response = await patientService.getAll();
      setPatients(response.data);
    } catch (err) {
      console.error('Failed to load patients:', err);
    }
  };

  const handleAddClick = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
    });
    setError('');
    setOpenDialog(true);
  };

  const handleClose = () => {
    setOpenDialog(false);
  };

  const handleSubmit = async () => {
    try {
      setError('');
      await patientService.create(formData);
      loadPatients();
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add patient');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1">
            Patients
          </Typography>
          <Button variant="contained" color="primary" onClick={handleAddClick}>
            Add Patient
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell>First Name</TableCell>
                <TableCell>Last Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Gender</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {patients.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell>{patient.first_name}</TableCell>
                  <TableCell>{patient.last_name}</TableCell>
                  <TableCell>{patient.email}</TableCell>
                  <TableCell>{patient.phone}</TableCell>
                  <TableCell>{patient.gender}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={openDialog} onClose={handleClose} maxWidth="sm" fullWidth>
          <DialogTitle>Add New Patient</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
            <TextField
              fullWidth
              label="First Name"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Last Name"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              margin="normal"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained" color="primary">
              Add
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default Patients;
