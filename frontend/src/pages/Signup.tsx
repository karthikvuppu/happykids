import React, { useState } from 'react';
import { Container, Box, Paper, Typography, TextField, Button, Alert, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', full_name: '', password: '', role: 'user' });
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authService.signup(form);
      setAlert({ type: 'success', msg: 'Account created! Redirecting to login...' });
      setTimeout(() => navigate('/login'), 1500);
    } catch (e: any) {
      setAlert({ type: 'error', msg: e.response?.data?.detail || 'Signup failed' });
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%', borderRadius: 2 }}>
          <Typography variant="h5" fontWeight={600} mb={3}>Sign Up</Typography>
          {alert && <Alert severity={alert.type} sx={{ mb: 2 }}>{alert.msg}</Alert>}
          <form onSubmit={handleSubmit}>
            <TextField fullWidth label="Username" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} margin="normal" required />
            <TextField fullWidth label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} margin="normal" required />
            <TextField fullWidth label="Full Name" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} margin="normal" required />
            <TextField fullWidth label="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} margin="normal" required />
            <FormControl fullWidth margin="normal">
              <InputLabel>Role</InputLabel>
              <Select label="Role" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="doctor">Doctor</MenuItem>
                <MenuItem value="nurse">Nurse</MenuItem>
              </Select>
            </FormControl>
            <Button fullWidth variant="contained" size="large" type="submit" sx={{ mt: 2 }}>Sign Up</Button>
          </form>
          <Typography sx={{ mt: 2, textAlign: 'center', fontSize: 13 }}>
            Have an account? <Button size="small" onClick={() => navigate('/login')}>Login</Button>
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default Signup;
