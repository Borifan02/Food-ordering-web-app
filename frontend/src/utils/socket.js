import { io } from "socket.io-client";

let socket = null;

export const getSocket = () => {
  if (!socket) {
    const serverUrl =
      import.meta.env.VITE_SOCKET_URL ||
      import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ||
      window.location.origin;

    socket = io(serverUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      autoConnect: true,
    });

    socket.on("connect", () => {
      console.log("Connected to real-time notification socket:", socket.id);
    });

    socket.on("connect_error", (err) => {
      console.warn("Socket connection warning:", err.message);
    });
  }

  return socket;
};

