import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Container, Box, TextField, Button, Typography, Paper, List, ListItem, ListItemText, Divider, Alert } from '@mui/material';

// Get server URL based on environment
const SERVER_URL = import.meta.env.PROD 
  ? window.location.origin  // In production, use the same domain
  : 'http://localhost:5000'; // In development, use localhost

// Initialize socket with error handling
let socket;
try {
  socket = io(SERVER_URL, {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });
} catch (error) {
  console.error('Socket initialization error:', error);
}

function App() {
  const [username, setUsername] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    if (!socket) {
      setConnectionError(true);
      return;
    }

    // Connection event handlers
    socket.on('connect', () => {
      console.log('Connected to server');
      setConnectionError(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnectionError(true);
    });

    socket.on('message', (message) => {
      console.log('Received message:', message);
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    socket.on('userList', (userList) => {
      console.log('Received user list:', userList);
      setUsers(userList);
    });

    socket.on('userJoined', ({ username }) => {
      console.log('User joined:', username);
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: `${username} joined the chat`, system: true }
      ]);
    });

    socket.on('userLeft', ({ username }) => {
      console.log('User left:', username);
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: `${username} left the chat`, system: true }
      ]);
    });

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('message');
      socket.off('userList');
      socket.off('userJoined');
      socket.off('userLeft');
    };
  }, []);

  const handleJoin = (e) => {
    e.preventDefault();
    if (username.trim() && socket) {
      console.log('Joining chat with username:', username);
      socket.emit('join', username);
      setIsJoined(true);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && socket) {
      console.log('Sending message:', message);
      socket.emit('message', { text: message });
      setMessage('');
    }
  };

  if (connectionError) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 8 }}>
          <Alert severity="error">
            Unable to connect to chat server. Please make sure the server is running at {SERVER_URL}
          </Alert>
        </Box>
      </Container>
    );
  }

  if (!isJoined) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom>
            Join Chat
          </Typography>
          <form onSubmit={handleJoin}>
            <TextField
              fullWidth
              label="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              margin="normal"
            />
            <Button 
              type="submit" 
              variant="contained" 
              sx={{ mt: 2 }}
              disabled={!username.trim()}
            >
              Join
            </Button>
          </form>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Paper sx={{ height: '70vh', overflow: 'auto', p: 2, mb: 2 }}>
            <List>
              {messages.map((msg, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={msg.system ? (
                      <Typography variant="body2" color="text.secondary">
                        {msg.text}
                      </Typography>
                    ) : (
                      <>
                        <Typography component="span" variant="subtitle2" color="primary">
                          {msg.username}:
                        </Typography>
                        {' ' + msg.text}
                      </>
                    )}
                    secondary={!msg.system && new Date(msg.timestamp).toLocaleTimeString()}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
          <form onSubmit={handleSendMessage}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                label="Type a message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <Button 
                type="submit" 
                variant="contained"
                disabled={!message.trim()}
              >
                Send
              </Button>
            </Box>
          </form>
        </Box>
        <Paper sx={{ width: 200, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Online Users ({users.length})
          </Typography>
          <Divider />
          <List>
            {users.map((user, index) => (
              <ListItem key={index}>
                <ListItemText primary={user} />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Box>
    </Container>
  );
}

export default App;
