import { io } from "socket.io-client";

const URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const socket = io(URL, {
    transports: ['websocket'],
    autoConnect: false,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000,
});

// Listeners globales para debugging
if (typeof window !== 'undefined') {
    socket.on('connect', () => {
        console.log('✅ Socket conectado:', socket.id);
    });

    socket.on('disconnect', (reason) => {
        console.log('❌ Socket desconectado:', reason);
    });

    socket.on('connect_error', (error) => {
        console.error('❌ Error de conexión:', error.message);
    });

    socket.on('errorEvento', (data) => {
        console.error('❌ Error del servidor:', data.message);
    });
}