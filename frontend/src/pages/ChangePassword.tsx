import React, { useState } from 'react';
import { Container, Box, Paper, Typography, TextField, Button, Alert } from '@mui/material';
import { authService } from '../services/api';

const ChangePassword: React.FC = () => {
  const [form, setForm] = useState({ old: '', new: '', confirm: '' });
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showAlert = (type: 'success' | 'error', msg: string) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  };

  const handleSubmit = async () => {
    if (form.new !== form.confirm) return showAlert('error', 'Passwords do not match');
    try {
      await authService.changePassword({ old_password: form.old, new_password: form.new });
      showAlert('success', 'Password changed successfully!');
      setForm({ old: '', new: '', confirm: '' });
    } catch (e: any) {
      showAlert('error', e.response?.data?.detail || 'Failed to change password');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%', borderRadius: 2 }}>
          <Typography variant="h5" fontWeight={600} mb={3}>Change Password</Typography>
          {alert && <Alert severity={alert.type} sx={{ mb: 2 }}>{alert.msg}</Alert>}
          <TextField fullWidth label="Current Password" type="password" value={form.old} onChange={e => setForm(f => ({ ...f, old: e.target.value }))} margin="normal" />
          <TextField fullWidth label="New Password" type="password" value={form.new} onChange={e => setForm(f => ({ ...f, new: e.target.value }))} margin="normal" />
          <TextField fullWidth label="Confirm New Password" type="password" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} margin="normal" />
          <Button fullWidth variant="contained" size="large" sx={{ mt: 2 }} onClick={handleSubmit}>Change Password</Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default ChangePassword;
