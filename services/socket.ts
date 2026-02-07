import { io, Socket } from 'socket.io-client';

// PRODUCTION: Replace with your DigitalOcean App URL after deployment
// Example: 'https://swing-mates-server-xxxxx.ondigitalocean.app'
// For local development, use your machine's IP
import { Platform } from 'react-native';

// PRODUCTION: Replace with your DigitalOcean App URL after deployment
// Example: 'https://swing-mates-server-xxxxx.ondigitalocean.app'
// For local development, use your machine's IP
const SERVER_IP = '10.28.114.194'; // REPLACE THIS WITH YOUR COMPUTER'S LOCAL IP FOR NATIVE TESTING
const SERVER_PORT = '3000';

const SERVER_URL = Platform.OS === 'web'
    ? `http://localhost:${SERVER_PORT}`
    : `http://${SERVER_IP}:${SERVER_PORT}`;

class SocketService {
    public socket: Socket | null = null;


    connect() {
        if (this.socket) return; // Prevent overwriting existing connection

        this.socket = io(SERVER_URL, {
            transports: ['websocket'],
        });

        this.socket.on('connect', () => {
            console.log('Connected to server with ID:', this.socket?.id);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });

        this.socket.on('connect_error', (err) => {
            console.log('Socket connection error:', err);
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    emit(event: string, ...args: any[]) {
        if (this.socket) {
            this.socket.emit(event, ...args);
        }
    }

    on(event: string, callback: (data: any) => void) {
        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    off(event: string) {
        if (this.socket) {
            this.socket.off(event);
        }
    }
}

export default new SocketService();
