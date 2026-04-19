import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Admissions from './pages/Admissions';
import Rooms from './pages/Rooms';

const AppBar_Component: React.FC<{ userLoggedIn: boolean }> = ({ userLoggedIn }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Hospital Management System
        </Typography>
        {userLoggedIn && (
          <>
            <Button color="inherit" onClick={() => navigate('/dashboard')}>
              Dashboard
            </Button>
            <Button color="inherit" onClick={() => navigate('/patients')}>
              Patients
            </Button>
            <Button color="inherit" onClick={() => navigate('/admissions')}>
              Admissions
            </Button>
            <Button color="inherit" onClick={() => navigate('/rooms')}>
              Rooms
            </Button>
            <Button color="inherit" onClick={handleLogout}>
              Logout
            </Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};

function App() {
  const userLoggedIn = !!localStorage.getItem('access_token');

  return (
    <BrowserRouter>
      <AppBar_Component userLoggedIn={userLoggedIn} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={userLoggedIn ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/patients"
          element={userLoggedIn ? <Patients /> : <Navigate to="/login" />}
        />
        <Route
          path="/admissions"
          element={userLoggedIn ? <Admissions /> : <Navigate to="/login" />}
        />
        <Route
          path="/rooms"
          element={userLoggedIn ? <Rooms /> : <Navigate to="/login" />}
        />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
