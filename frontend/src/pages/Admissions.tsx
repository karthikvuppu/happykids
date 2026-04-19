import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import { admissionService } from '../services/api';
import { Admission } from '../types';

const Admissions_Page: React.FC = () => {
  const [admissions, setAdmissions] = useState<Admission[]>([]);

  useEffect(() => {
    loadAdmissions();
  }, []);

  const loadAdmissions = async () => {
    try {
      const response = await admissionService.getAll();
      setAdmissions(response.data);
    } catch (err) {
      console.error('Failed to load admissions:', err);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Admissions
        </Typography>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell>ID</TableCell>
                <TableCell>Patient ID</TableCell>
                <TableCell>Room ID</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Admission Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {admissions.map((admission) => (
                <TableRow key={admission.id}>
                  <TableCell>{admission.id}</TableCell>
                  <TableCell>{admission.patient_id}</TableCell>
                  <TableCell>{admission.room_id}</TableCell>
                  <TableCell>{admission.status}</TableCell>
                  <TableCell>{new Date(admission.admission_date).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Container>
  );
};

export default Admissions_Page;
