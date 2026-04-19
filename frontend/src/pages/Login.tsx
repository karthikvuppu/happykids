import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Alert, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import { LoginPayload } from '../types';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<LoginPayload>({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await authService.login(formData);
      localStorage.setItem('access_token', response.data.access_token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #e3f2fd 0%, #fce4ec 50%, #f3e5f5 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 440 }}>

        {/* Brand Header */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          {/* Rainbow */}
          <Typography sx={{ fontSize: 48, lineHeight: 1, mb: 0.5 }}>🌈</Typography>

          {/* HAPPY KIDS colorful letters */}
          <Box sx={{ display: 'inline-flex', gap: '2px', justifyContent: 'center', mb: 0.5 }}>
            {['H','A','P','P','Y',' ','K','I','D','S'].map((ch, i) => {
              const colors = ['#e53935','#fb8c00','#fdd835','#43a047','#1e88e5','#fff','#8e24aa','#e53935','#00897b','#f4511e']
              return ch === ' '
                ? <span key={i} style={{ width: 12 }} />
                : <span key={i} style={{ fontSize: 38, fontWeight: 900, color: colors[i], textShadow: '2px 2px 0 rgba(0,0,0,0.15)', fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif' }}>{ch}</span>
            })}
          </Box>

          {/* Children's Clinic */}
          <Typography
            sx={{
              fontSize: 22,
              fontWeight: 800,
              color: '#1a237e',
              letterSpacing: 0.5,
              fontFamily: 'Georgia, serif',
              mb: 0.5,
            }}
          >
            Children's Clinic
          </Typography>

          {/* Telugu */}
          <Typography
            sx={{
              fontSize: 16,
              fontWeight: 700,
              color: '#880e4f',
              letterSpacing: 0.3,
            }}
          >
            హ్యాపీ కిడ్స్ పిల్లల ఆసుపత్రి
          </Typography>
        </Box>

        {/* Login Card */}
        <Paper
          elevation={6}
          sx={{
            p: 4,
            borderRadius: 3,
            border: '2px solid #e3f2fd',
          }}
        >
          <Typography
            variant="h6"
            align="center"
            fontWeight={700}
            color="text.secondary"
            mb={2}
          >
            Staff Login
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth label="Username" name="username"
              value={formData.username} onChange={handleChange}
              margin="normal" required size="small"
            />
            <TextField
              fullWidth label="Password" name="password" type="password"
              value={formData.password} onChange={handleChange}
              margin="normal" required size="small"
            />
            <Button
              fullWidth variant="contained" size="large" type="submit"
              disabled={loading}
              sx={{
                mt: 3, py: 1.5, borderRadius: 2, fontWeight: 700, fontSize: 16,
                background: 'linear-gradient(90deg, #1e88e5, #8e24aa)',
                '&:hover': { background: 'linear-gradient(90deg, #1565c0, #6a1b9a)' },
              }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <Typography sx={{ mt: 2, textAlign: 'center', fontSize: 13 }} color="text.secondary">
            New user?{' '}
            <Button size="small" color="primary" onClick={() => navigate('/signup')}>
              Sign up
            </Button>
          </Typography>
        </Paper>

        <Typography align="center" sx={{ mt: 2, fontSize: 12, color: '#888' }}>
          © 2025 HappyKids Children's Clinic
        </Typography>
      </Box>
    </Box>
  );
};

export default Login;
