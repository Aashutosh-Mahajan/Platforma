import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { Event, Seat, TicketType } from '../types';

interface BookingContextType {
  event: Event | null;
  selectedSeats: Seat[];
  ticketType: TicketType | null;
  subtotal: number;
  tax: number;
  total: number;
  setEvent: (event: Event) => void;
  setTicketType: (ticketType: TicketType) => void;
  addSeat: (seat: Seat) => void;
  removeSeat: (seatId: number) => void;
  clearBooking: () => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [event, setEvent] = useState<Event | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [ticketType, setTicketType] = useState<TicketType | null>(null);

  // Calculate totals
  const subtotal = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  const tax = subtotal * 0.18; // 18% GST
  const total = subtotal + tax;

  const addSeat = (seat: Seat) => {
    setSelectedSeats((prevSeats) => {
      const exists = prevSeats.find((s) => s.id === seat.id);
      if (!exists) {
        return [...prevSeats, seat];
      }
      return prevSeats;
    });
  };

  const removeSeat = (seatId: number) => {
    setSelectedSeats((prevSeats) => prevSeats.filter((s) => s.id !== seatId));
  };

  const clearBooking = () => {
    setEvent(null);
    setSelectedSeats([]);
    setTicketType(null);
  };

  const value: BookingContextType = {
    event,
    selectedSeats,
    ticketType,
    subtotal,
    tax,
    total,
    setEvent,
    setTicketType,
    addSeat,
    removeSeat,
    clearBooking,
  };

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
};

export const useBooking = (): BookingContextType => {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};
