import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import { roomService } from '../services/api';
import { Room } from '../types';

const Rooms: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const response = await roomService.getAll();
      setRooms(response.data);
    } catch (err) {
      console.error('Failed to load rooms:', err);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Rooms
        </Typography>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell>Room Number</TableCell>
                <TableCell>Ward</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Capacity</TableCell>
                <TableCell>Price/Day</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rooms.map((room) => (
                <TableRow key={room.id}>
                  <TableCell>{room.room_number}</TableCell>
                  <TableCell>{room.ward}</TableCell>
                  <TableCell>{room.room_type}</TableCell>
                  <TableCell>{room.capacity}</TableCell>
                  <TableCell>₹{room.price_per_day}</TableCell>
                  <TableCell>
                    <Chip
                      label={room.is_available ? 'Available' : 'Occupied'}
                      color={room.is_available ? 'success' : 'error'}
                      variant="outlined"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Container>
  );
};

export default Rooms;
