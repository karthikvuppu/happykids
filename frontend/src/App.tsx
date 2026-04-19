import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Consultation from './pages/Consultation';
import ChangePassword from './pages/ChangePassword';
import Growth from './pages/Growth';
import Pharmacy from './pages/Pharmacy';

const NavBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = !!localStorage.getItem('access_token');
  const isAuthPage = ['/login', '/signup'].includes(location.pathname);
  if (isAuthPage) return null;

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1, cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
          HappyKids Hospital
        </Typography>
        {isLoggedIn && (
          <>
            <Button color="inherit" onClick={() => navigate('/dashboard')}>Dashboard</Button>
            <Button color="inherit" onClick={() => navigate('/patients')}>Enrollment</Button>
            <Button color="inherit" onClick={() => navigate('/consultation')}>Consultation</Button>
            <Button color="inherit" onClick={() => navigate('/growth')}>Growth Charts</Button>
            <Button color="inherit" onClick={() => navigate('/pharmacy')}>Pharmacy</Button>
            <Button color="inherit" onClick={() => navigate('/change-password')}>Change Password</Button>
            <Button color="inherit" onClick={handleLogout}>Logout</Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};

const PrivateRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  return !!localStorage.getItem('access_token') ? element : <Navigate to="/login" replace />;
};

function AppRoutes() {
  useLocation();
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<PrivateRoute element={<Dashboard />} />} />
        <Route path="/patients" element={<PrivateRoute element={<Patients />} />} />
        <Route path="/consultation" element={<PrivateRoute element={<Consultation />} />} />
        <Route path="/change-password" element={<PrivateRoute element={<ChangePassword />} />} />
        <Route path="/growth" element={<PrivateRoute element={<Growth />} />} />
        <Route path="/pharmacy" element={<PrivateRoute element={<Pharmacy />} />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
