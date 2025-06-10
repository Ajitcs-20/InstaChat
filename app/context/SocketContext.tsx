import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useUser } from './UserContext';

interface SocketContextType {
  socket: Socket | null;
  currentRoomId: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  findMatch: () => void;
  sendMessage: (message: string) => void;
  reportUser: (reason: string) => void;
  endChat: () => void;
  reconnect: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();

  const initializeSocket = () => {
    setIsConnecting(true);
    setError(null);

    const socketInstance = io('http://192.168.29.113:3000', {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      console.log('Connected to socket server');
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Connection error:', err.message);
      setError(`Failed to connect to server: ${err.message}`);
      setIsConnected(false);
      setIsConnecting(false);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Disconnected from socket server:', reason);
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        socketInstance.connect();
      }
    });

    socketInstance.on('error', (err) => {
      console.error('Socket error:', err);
      setError(`Socket error: ${err.message}`);
    });

    // Listen for match found
    socketInstance.on('match_found', (data) => {
      console.log('Match found event received:', data);
      setCurrentRoomId(data.roomId);
    });

    // Listen for match status
    socketInstance.on('match_status', (status) => {
      console.log('Match status received:', status);
    });

    setSocket(socketInstance);

    return socketInstance;
  };

  useEffect(() => {
    const socketInstance = initializeSocket();

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const reconnect = () => {
    if (socket) {
      socket.disconnect();
    }
    initializeSocket();
  };

  const findMatch = () => {
    if (!socket || !user) {
      console.log('Cannot find match:', { socket: !!socket, user: !!user });
      setError('Please complete your profile before finding a match.');
      return;
    }

    if (!isConnected) {
      console.log('Not connected to server');
      setError('Not connected to server. Please check your internet connection.');
      return;
    }

    console.log('Finding match with user data:', {
      userId: user.userId,
      age: user.age,
      gender: user.gender,
      preference: user.preference
    });

    // Emit find_match event with user data
    socket.emit('find_match', {
      userId: user.userId,
      age: user.age,
      gender: user.gender,
      preference: user.preference
    });

    // Set searching status
    socket.emit('match_status', 'searching');
  };

  const sendMessage = (message: string) => {
    if (!socket || !currentRoomId) {
      console.log('Cannot send message:', { socket: !!socket, currentRoomId });
      setError('Unable to send message. Please try again.');
      return;
    }

    if (!isConnected) {
      console.log('Not connected to server');
      setError('Not connected to server. Please check your internet connection.');
      return;
    }

    console.log('Sending message to room:', currentRoomId, message);
    socket.emit('message', {
      roomId: currentRoomId,
      message,
      sender: user?.userId
    });
  };

  const reportUser = (reason: string) => {
    if (!socket || !currentRoomId) {
      console.log('Cannot report user:', { socket: !!socket, currentRoomId });
      setError('Unable to report user. Please try again.');
      return;
    }

    if (!isConnected) {
      console.log('Not connected to server');
      setError('Not connected to server. Please check your internet connection.');
      return;
    }

    console.log('Reporting user in room:', currentRoomId, reason);
    socket.emit('report_user', {
      roomId: currentRoomId,
      reason,
      reporterId: user?.userId
    });
  };

  const endChat = () => {
    if (!socket || !currentRoomId) {
      console.log('Cannot end chat:', { socket: !!socket, currentRoomId });
      setError('Unable to end chat. Please try again.');
      return;
    }

    if (!isConnected) {
      console.log('Not connected to server');
      setError('Not connected to server. Please check your internet connection.');
      return;
    }

    console.log('Ending chat in room:', currentRoomId);
    socket.emit('end_chat', {
      roomId: currentRoomId,
      userId: user?.userId
    });
    setCurrentRoomId(null);
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        currentRoomId,
        isConnected,
        isConnecting,
        error,
        findMatch,
        sendMessage,
        reportUser,
        endChat,
        reconnect
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
} 