import { io } from "socket.io-client";
import { AUTH_TOKEN_KEY } from "./context/authContext";

export const socket = io(import.meta.env.VITE_BACKEND_API_URL, {
  auth: {
    token: localStorage.getItem(AUTH_TOKEN_KEY),
  },
});
