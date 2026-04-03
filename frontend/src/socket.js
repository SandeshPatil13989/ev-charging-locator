import { io } from "socket.io-client";

export const socket = io("http://localhost:5000", {
  transports: ["websocket", "polling"],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 60000,
});