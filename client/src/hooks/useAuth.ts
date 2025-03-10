import { useContext } from "react";
import { AuthContext, AuthContextType } from "../context/authContext";

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("Failed to use hook, no Auth Context provided.");
  }
  return context;
}
