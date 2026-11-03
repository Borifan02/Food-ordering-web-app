import { io } from "socket.io-client";

let socket = null;

const cleanServerUrl = (url) => {
  if (!url) return "";
  let cleaned = String(url).trim();
  // Strip quotes if user wrapped URL in quotes in Vercel/Render env
  cleaned = cleaned.replace(/^['"]+|['"]+$/g, "").trim();
  // Strip /api suffix if someone passed VITE_API_URL as VITE_SOCKET_URL
  cleaned = cleaned.replace(/\/api\/?$/i, "").trim();
  // Strip trailing slashes
  cleaned = cleaned.replace(/\/+$/, "");
  return cleaned;
};

export const getSocket = () => {
  if (!socket) {
    const rawUrl =
      import.meta.env.VITE_SOCKET_URL ||
      import.meta.env.VITE_API_URL ||
      (typeof window !== "undefined" ? window.location.origin : "http://localhost:5000");

    const serverUrl = cleanServerUrl(rawUrl) || "http://localhost:5000";

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
