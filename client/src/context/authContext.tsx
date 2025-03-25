import { createContext, JSX, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { User } from "@/types/userTypes";
import { useMutation } from "@tanstack/react-query";
import { LoginFormData } from "@/pages/LoginPage";
import { ApiResponse } from "@/types/apiTypes";
import { RegisterFormData } from "@/pages/RegisterPage";
import { HOME_ROUTE, LOGIN_ROUTE } from "@/utils/routes";
import { fetchWithProxy } from "@/utils/proxyFetch";

const REFRESH_INTERVAL_MS = 60000 * 30; // 30 minutes

export const AUTH_TOKEN_KEY = "auth_token";

export interface AuthContextType {
  readonly user: User | null;
  readonly userToken: string | null;
  readonly login: (email: string, password: string) => Promise<void>;
  readonly register: (input: RegisterFormData) => Promise<void>;
  readonly logout: () => void;
  readonly isAuthenticated: boolean;
  readonly isAuthLoading: boolean;
}

interface AuthProviderProps {
  readonly children: React.ReactNode;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: LoginFormData) => {
      const loginResponse = await fetchWithProxy({
        endpoint: "auth/login",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!loginResponse.ok) {
        const errorData = await loginResponse.json();
        throw new Error(errorData.message);
      }

      return await loginResponse.json();
    },
    onSuccess: (
      successResponse: ApiResponse<{ token: string; user: User }>
    ) => {
      const token = successResponse.data.token;
      setUser(successResponse.data.user);
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      setUserToken(token);
      toast({
        title: "Welcome back!",
        description: "Successfully logged in.",
      });
      navigate(HOME_ROUTE);
    },
    onError: (errorResponse) => {
      toast({
        title: "Login Error.",
        description: errorResponse.message || "There was an error logging in.",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({ name, email, password }: RegisterFormData) => {
      const registerResponse = await fetchWithProxy({
        endpoint: "auth/register",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json();
        throw new Error(errorData.message);
      }

      return await registerResponse.json();
    },
    onSuccess: () => {
      toast({
        title: "Registration Successful.",
        description: "Successfully registered.",
      });
      navigate(LOGIN_ROUTE);
    },
    onError: (errorResponse) => {
      toast({
        title: "Registration Error.",
        description: errorResponse.message || "There was an error signing up.",
      });
    },
  });

  async function login(email: string, password: string): Promise<void> {
    await loginMutation.mutateAsync({ email, password });
  }

  async function register(input: RegisterFormData): Promise<void> {
    await registerMutation.mutateAsync(input);
  }

  function logout(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setUser(null);
    setIsAuthLoading(false);
    navigate(LOGIN_ROUTE);
  }

  async function refreshToken(): Promise<void> {
    setIsAuthLoading(true);

    const localToken = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!localToken) {
      setIsAuthLoading(false);
      return;
    }

    const refreshResponse = await fetchWithProxy({
      endpoint: "auth/refresh",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken: localToken }),
    });

    if (!refreshResponse.ok) {
      logout();
      return;
    }

    const refreshData: ApiResponse<{ token: string; user: User }> =
      await refreshResponse.json();

    const token = refreshData.data.token;
    setUser(refreshData.data.user);
    setUserToken(token);
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    setIsAuthLoading(false);
  }

  // Check if user is already logged in on page load/refresh
  useEffect(() => {
    if (!user) {
      refreshToken();
      const refreshInterval = setInterval(refreshToken, REFRESH_INTERVAL_MS);

      return () => {
        clearInterval(refreshInterval);
      };
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        userToken,
        isAuthenticated: user !== null,
        login,
        register,
        isAuthLoading,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
