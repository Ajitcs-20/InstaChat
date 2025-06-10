import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSocket } from '../context/SocketContext';
import { useUser } from '../context/UserContext';

export default function HomeScreen() {
  const [isSearching, setIsSearching] = useState(false);
  const { user } = useUser();
  const { socket, findMatch, isConnected, isConnecting, error, reconnect } = useSocket();
  const router = useRouter();

  useEffect(() => {
    if (!socket) {
      console.log('Socket not initialized in HomeScreen');
      return;
    }

    console.log('Setting up socket listeners in HomeScreen');

    // Listen for match found
    socket.on('match_found', (data) => {
      console.log('Match found:', data);
      setIsSearching(false);
      // Use replace instead of push to prevent going back to home screen
      router.replace('/chat');
    });

    // Listen for match error
    socket.on('match_error', (error) => {
      console.log('Match error:', error);
      setIsSearching(false);
      Alert.alert('Error', error.message || 'Failed to find a match. Please try again.');
    });

    // Listen for match status
    socket.on('match_status', (status) => {
      console.log('Match status:', status);
      if (status === 'searching') {
        setIsSearching(true);
      } else {
        setIsSearching(false);
      }
    });

    return () => {
      console.log('Cleaning up socket listeners in HomeScreen');
      socket.off('match_found');
      socket.off('match_error');
      socket.off('match_status');
    };
  }, [socket, router]);

  useEffect(() => {
    if (error) {
      console.log('Socket error in HomeScreen:', error);
      Alert.alert('Error', error, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Retry', onPress: reconnect }
      ]);
    }
  }, [error, reconnect]);

  const handleFindMatch = () => {
    if (!isConnected) {
      console.log('Not connected to server in HomeScreen');
      Alert.alert(
        'Connection Error',
        'Not connected to server. Please check your internet connection.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: reconnect }
        ]
      );
      return;
    }

    console.log('Starting match search');
    setIsSearching(true);
    findMatch();
  };

  if (isConnecting) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.connectingText}>Connecting to server...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>
        Welcome, {user?.name}! 👋
      </Text>
      
      <Text style={styles.description}>
        Ready to start chatting? Find a match based on your preferences.
      </Text>

      <TouchableOpacity
        style={[
          styles.findMatchButton,
          (isSearching || !isConnected) && styles.findMatchButtonDisabled
        ]}
        onPress={handleFindMatch}
        disabled={isSearching || !isConnected}
      >
        {isSearching ? (
          <>
            <ActivityIndicator color="#fff" style={styles.loadingIndicator} />
            <Text style={styles.findMatchButtonText}>Finding Match...</Text>
          </>
        ) : !isConnected ? (
          <>
            <FontAwesome name="wifi" size={20} color="#fff" style={styles.searchIcon} />
            <Text style={styles.findMatchButtonText}>Reconnecting...</Text>
          </>
        ) : (
          <>
            <FontAwesome name="search" size={20} color="#fff" style={styles.searchIcon} />
            <Text style={styles.findMatchButtonText}>Find Match</Text>
          </>
        )}
      </TouchableOpacity>

      {isSearching && (
        <Text style={styles.searchingText}>
          Looking for someone to chat with...
        </Text>
      )}

      {!isConnected && (
        <TouchableOpacity style={styles.retryButton} onPress={reconnect}>
          <Text style={styles.retryButtonText}>Retry Connection</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  findMatchButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
    maxWidth: 300,
  },
  findMatchButtonDisabled: {
    backgroundColor: '#999',
  },
  findMatchButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchIcon: {
    marginRight: 10,
  },
  loadingIndicator: {
    marginRight: 10,
  },
  searchingText: {
    marginTop: 20,
    color: '#666',
    fontSize: 14,
  },
  connectingText: {
    marginTop: 20,
    color: '#666',
    fontSize: 16,
  },
  retryButton: {
    marginTop: 20,
    padding: 10,
  },
  retryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 