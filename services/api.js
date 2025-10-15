import axios from "axios";

const BASE_URL = "http://localhost:4000"; // Puerto del backend

export const api = axios.create({
  baseURL: BASE_URL,
});

// Jugadores
export const crearJugador = (nombre) => api.post("/api/jugadores", { nombre });

// Juegos
export const listarJuegos = () => api.get("/api/juegos");
export const crearJuego = (payLoad) => api.post("/api/juegos", payLoad);
export const obtenerJuego = (codigo) => api.get(`/api/juegos/${codigo}`);
export const unirseJuegoRest = (codigo, jugadorId) =>
  api.post(`/api/juegos/${codigo}/unirse`, { jugadorId });

// Cartas
