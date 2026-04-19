import React, { useEffect, useState } from 'react';
import { Box, Container, Typography, Paper, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { patientService } from '../services/api';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [patientCount, setPatientCount] = useState(0);

  useEffect(() => {
    patientService.getAll().then(r => setPatientCount(r.data.length)).catch(() => {});
  }, []);

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h5" fontWeight={600} mb={3}>Dashboard</Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
          <Paper elevation={1} sx={{ p: 3, textAlign: 'center', flex: 1, borderRadius: 2 }}>
            <Typography variant="h3" fontWeight={700} color="primary">{patientCount}</Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>Enrolled Patients</Typography>
          </Paper>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2 }}>
          <Button variant="contained" size="large" onClick={() => navigate('/patients')}>Enrollment</Button>
          <Button variant="contained" color="secondary" size="large" onClick={() => navigate('/consultation')}>Consultation</Button>
        </Box>
      </Box>
    </Container>
  );
};

export default Dashboard;
