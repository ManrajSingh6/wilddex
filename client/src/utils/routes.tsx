import { useAuth } from "@/hooks/useAuth";
import { JSX } from "react";
import { Navigate, Outlet } from "react-router-dom";

export const HOME_ROUTE = "/home";
export const LOGIN_ROUTE = "/login";
export const REGISTER_ROUTE = "/register";
export const PROFILE_ROUTE = "/profile";
export const COMMUNITY_POSTS_ROUTE = "/community-posts";

export function ProtectedRoute(): JSX.Element {
  const { isAuthLoading, user } = useAuth();

  if (isAuthLoading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    return <Navigate to={LOGIN_ROUTE} />;
  }

  return <Outlet />;
}
