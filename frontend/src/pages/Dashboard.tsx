import React from 'react';
import { Box, Container, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 8 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Hospital In-Patient Management System
        </Typography>
        <Typography variant="h6" color="textSecondary" paragraph>
          Welcome to the hospital management system
        </Typography>

        <Box sx={{ mt: 4, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={() => navigate('/patients')}
          >
            Patients
          </Button>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            onClick={() => navigate('/admissions')}
          >
            Admissions
          </Button>
          <Button
            variant="contained"
            color="success"
            size="large"
            onClick={() => navigate('/rooms')}
          >
            Rooms
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default Dashboard;
