import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSocket } from '../context/SocketContext';
import { useUser } from '../context/UserContext';

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: number;
  read: boolean;
}

export default function ChatScreen() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const { user } = useUser();
  const { socket, currentRoomId, sendMessage, endChat, reportUser, isConnected, error, reconnect } = useSocket();
  const router = useRouter();

  useEffect(() => {
    if (!socket) {
      console.log('Socket not initialized');
      return;
    }

    console.log('Setting up socket listeners');
    console.log('Current user:', user);
    console.log('Current room ID:', currentRoomId);

    // Listen for new messages
    socket.on('message', (data) => {
      console.log('Received message:', data);
      const newMessage: Message = {
        id: Date.now().toString(),
        text: data.message,
        sender: data.sender,
        timestamp: Date.now(),
        read: false,
      };
      setMessages((prev) => [...prev, newMessage]);
      flatListRef.current?.scrollToEnd();
    });

    // Listen for user disconnection
    socket.on('user_disconnected', () => {
      console.log('User disconnected');
      Alert.alert('Chat Ended', 'The other user has disconnected.');
      router.replace('/(tabs)');
    });

    // Listen for chat ended
    socket.on('chat_ended', () => {
      console.log('Chat ended');
      Alert.alert('Chat Ended', 'The chat has been ended.');
      router.replace('/(tabs)');
    });

    // Listen for typing indicator
    socket.on('typing', (data) => {
      console.log('Typing indicator:', data);
      setIsTyping(data.isTyping);
    });

    return () => {
      console.log('Cleaning up socket listeners');
      socket.off('message');
      socket.off('user_disconnected');
      socket.off('chat_ended');
      socket.off('typing');
    };
  }, [socket, router, currentRoomId, user]);

  useEffect(() => {
    if (error) {
      console.log('Socket error:', error);
      Alert.alert('Error', error, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Retry', onPress: reconnect }
      ]);
    }
  }, [error, reconnect]);

  const handleSendMessage = () => {
    if (!message.trim() || !isConnected || !currentRoomId) {
      console.log('Cannot send message:', { isConnected, currentRoomId, message: message.trim() });
      return;
    }

    console.log('Sending message:', message);
    const newMessage: Message = {
      id: Date.now().toString(),
      text: message.trim(),
      sender: user?.userId || '',
      timestamp: Date.now(),
      read: false,
    };

    sendMessage(message.trim());
    setMessages(prev => [...prev, newMessage]);
    setMessage('');
    setIsTyping(false);
  };

  const handleEndChat = () => {
    if (!currentRoomId) {
      console.log('No active chat to end');
      return;
    }

    Alert.alert(
      'End Chat',
      'Are you sure you want to end this chat?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Chat',
          style: 'destructive',
          onPress: () => {
            console.log('Ending chat');
            endChat();
            router.replace('/(tabs)');
          },
        },
      ]
    );
  };

  const handleReport = () => {
    if (!currentRoomId) {
      console.log('No active chat to report');
      return;
    }

    Alert.alert(
      'Report User',
      'Are you sure you want to report this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            console.log('Reporting user');
            reportUser('Inappropriate behavior');
            router.replace('/(tabs)');
          },
        },
      ]
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender === user?.userId;
    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        {!isOwnMessage && (
          <View style={styles.avatarContainer}>
            <FontAwesome name="user-circle" size={24} color="#007AFF" />
          </View>
        )}
        <View style={styles.messageContent}>
          <Text style={styles.messageText}>{item.text}</Text>
          <View style={styles.messageFooter}>
            <Text style={styles.timestamp}>
              {new Date(item.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            {isOwnMessage && (
              <FontAwesome
                name={item.read ? 'check-circle' : 'check'}
                size={12}
                color={item.read ? '#007AFF' : '#999'}
                style={styles.readReceipt}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  if (!isConnected) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.connectingText}>Reconnecting to server...</Text>
        <TouchableOpacity style={styles.retryButton} onPress={reconnect}>
          <Text style={styles.retryButtonText}>Retry Connection</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={handleEndChat} style={styles.headerButton}>
          <FontAwesome name="times" size={24} color="#FF3B30" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleReport} style={styles.headerButton}>
          <FontAwesome name="flag" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      {isTyping && (
        <View style={styles.typingIndicator}>
          <Text style={styles.typingText}>Someone is typing...</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={(text) => {
            setMessage(text);
            if (!isTyping) {
              setIsTyping(true);
              setTimeout(() => setIsTyping(false), 3000);
            }
          }}
          placeholder="Type a message..."
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!message.trim() || !isConnected}
        >
          <FontAwesome name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerButton: {
    padding: 5,
  },
  messagesList: {
    padding: 15,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    maxWidth: '80%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  messageContent: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 20,
    borderTopRightRadius: 4,
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginRight: 4,
  },
  readReceipt: {
    marginLeft: 4,
  },
  typingIndicator: {
    padding: 10,
    alignItems: 'center',
  },
  typingText: {
    color: '#666',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  connectingText: {
    marginTop: 20,
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    padding: 10,
  },
  retryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
}); 