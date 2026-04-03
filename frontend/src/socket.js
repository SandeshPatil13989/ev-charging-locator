import { io } from "socket.io-client";

export const socket = io("https://ev-charging-api-8nph.onrender.com", {
  transports: ["websocket", "polling"],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 60000,
});