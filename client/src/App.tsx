import { Routes, Route, Navigate } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import {
  COMMUNITY_POSTS_ROUTE,
  HOME_ROUTE,
  LOGIN_ROUTE,
  PROFILE_ROUTE,
  ProtectedRoute,
  REGISTER_ROUTE,
} from "./utils/routes";
import { ProfilePage } from "./pages/ProfilePage";
import { LoginPage } from "./pages/LoginPage";
import { Layout } from "./pages/layout";
import { RegisterPage } from "./pages/RegisterPage";
import { AuthProvider } from "./context/authContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { APIProvider } from "@vis.gl/react-google-maps";
import { CommunityPage } from "./pages/CommunityPage";
import { NotificationsProvider } from "./context/notificationsContext";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

export const GOOGLE_MAPS_API_BASE_URL = `https://www.googleapis.com/geolocation/v1/geolocate?key=${GOOGLE_MAPS_API_KEY}`;

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationsProvider>
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <Routes>
              <Route path={LOGIN_ROUTE} element={<LoginPage />} />
              <Route path={REGISTER_ROUTE} element={<RegisterPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path={HOME_ROUTE} element={<HomePage />} />
                  <Route path={PROFILE_ROUTE} element={<ProfilePage />} />
                  <Route
                    path={COMMUNITY_POSTS_ROUTE}
                    element={<CommunityPage />}
                  />
                </Route>
              </Route>
              {/* Redirect invalid routes to landing page for non-authenticated users */}
              <Route path="*" element={<Navigate to={HOME_ROUTE} replace />} />
            </Routes>
            <Toaster />
          </APIProvider>
        </NotificationsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
