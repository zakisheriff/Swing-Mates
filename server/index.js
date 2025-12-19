const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

// Health check endpoint for DigitalOcean
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Swing Mates Server is running!' });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    }
});

// Store room data: roomId -> { strokes: [], users: {} }
const rooms = {};

const PORT = process.env.PORT || 3000;


io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Track which room this socket is in
    let currentRoom = null;
    let currentUserId = null;

    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        currentRoom = roomId;
        currentUserId = userId || socket.id;

        // Initialize room if not exists
        if (!rooms[roomId]) {
            rooms[roomId] = { strokes: [], users: {}, messages: [] };
        }

        // Add user to room
        rooms[roomId].users[socket.id] = currentUserId;

        const roomSize = io.sockets.adapter.rooms.get(roomId)?.size || 0;
        console.log(`User ${currentUserId} joined room ${roomId}. Total users: ${roomSize}`);

        // Send existing history to the new joiner
        socket.emit('load-canvas', rooms[roomId].strokes);

        // Send chat history
        socket.emit('load-messages', rooms[roomId].messages || []);

        // Send list of current users
        const userList = Object.values(rooms[roomId].users);
        socket.emit('room-users', userList);

        // Notify others in room with the userId (not socket.id)
        socket.to(roomId).emit('user-joined', { userId: currentUserId });
    });

    // Explicit request for canvas state
    socket.on('get-canvas', (roomId) => {
        if (rooms[roomId]) {
            socket.emit('load-canvas', rooms[roomId].strokes);
        }
    });

    // Client sends a full path or segment
    socket.on('draw-stroke', ({ roomId, path, color, strokeWidth, isEraser }) => {
        const userId = rooms[roomId]?.users[socket.id] || socket.id;
        const strokeData = { path, color, strokeWidth, userId, isEraser: isEraser || false };

        // Save to history
        if (rooms[roomId]) {
            rooms[roomId].strokes.push(strokeData);
        }

        // Broadcast to everyone else in the room
        socket.to(roomId).emit('draw-stroke', strokeData);
    });

    // Handle live drawing moves
    socket.on('drawing-move', ({ roomId, path, color, strokeWidth, isEraser }) => {
        const userId = rooms[roomId]?.users[socket.id] || socket.id;
        socket.to(roomId).emit('drawing-move', { path, color, strokeWidth, userId, isEraser: isEraser || false });
    });

    // Broadcast undo
    socket.on('undo-stroke', ({ roomId }) => {
        if (rooms[roomId] && rooms[roomId].strokes.length > 0) {
            rooms[roomId].strokes.pop();
        }
        socket.to(roomId).emit('undo-stroke');
    });

    // Clear canvas event
    socket.on('clear-canvas', (roomId) => {
        if (rooms[roomId]) {
            rooms[roomId].strokes = [];
        }
        io.to(roomId).emit('clear-canvas');
    });

    // Chat messages
    socket.on('send-message', ({ roomId, message, userId, timestamp }) => {
        const msgData = { message, userId, timestamp };
        // Store message in room history
        if (rooms[roomId]) {
            rooms[roomId].messages = rooms[roomId].messages || [];
            rooms[roomId].messages.push(msgData);
            // Keep last 100 messages only
            if (rooms[roomId].messages.length > 100) {
                rooms[roomId].messages = rooms[roomId].messages.slice(-100);
            }
        }
        socket.to(roomId).emit('receive-message', msgData);
    });

    // Check if room exists
    socket.on('check-room', (roomId, callback) => {
        const exists = rooms[roomId] !== undefined &&
            (io.sockets.adapter.rooms.get(roomId)?.size || 0) > 0;
        callback(exists);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);

        // Notify room about disconnection
        if (currentRoom && rooms[currentRoom]) {
            const userId = rooms[currentRoom].users[socket.id];
            delete rooms[currentRoom].users[socket.id];

            if (userId) {
                socket.to(currentRoom).emit('user-left', { userId });
            }

            // Clean up empty rooms
            if (Object.keys(rooms[currentRoom].users).length === 0) {
                delete rooms[currentRoom];
                console.log(`Room ${currentRoom} deleted (empty)`);
            }
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`SERVER RUNNING ON PORT ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
