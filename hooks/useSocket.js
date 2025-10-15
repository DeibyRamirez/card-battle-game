import { useEffect } from 'react';
import { socket } from '../services/socket';

export const useSocket = (eventHandlers = {}) => {
    useEffect(() => {
        // Conectar si no está conectado
        if (!socket.connected) {
            socket.connect();
        }

        // Registrar todos los event handlers
        Object.entries(eventHandlers).forEach(([event, handler]) => {
            socket.on(event, handler);
        });

        // Cleanup: remover listeners al desmontar
        return () => {
            Object.entries(eventHandlers).forEach(([event, handler]) => {
                socket.off(event, handler);
            });
        };
    }, [eventHandlers]);

    return socket;
};