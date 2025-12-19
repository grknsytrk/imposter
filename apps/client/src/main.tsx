import { StrictMode, useEffect, useState, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useLocation } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthPage } from './pages/AuthPage.tsx'
import { ProfileSetup } from './pages/ProfileSetup.tsx'
import { ResetPassword } from './pages/ResetPassword.tsx'
import { useAuthStore } from './store/useAuthStore.ts'
import { useGameStore } from './store/useGameStore.ts'

function AuthWrapper() {
  const { user, profile, loading, profileLoading, initialize } = useAuthStore();
  const { connect, isConnected } = useGameStore();
  const [initialized, setInitialized] = useState(false);
  const connectionAttempted = useRef(false);
  const [hasConnectedOnce, setHasConnectedOnce] = useState(false);
  const location = useLocation();

  // Initialize auth
  useEffect(() => {
    initialize().then(() => setInitialized(true));
  }, [initialize]);

  // Auto-connect when profile is ready
  useEffect(() => {
    if (initialized && profile && user && !isConnected && !connectionAttempted.current) {
      connectionAttempted.current = true;
      const AVATAR_IDS = ['ghost', 'cat', 'dog', 'star', 'zap', 'heart', 'music', 'smile'];
      const avatarToUse = AVATAR_IDS.includes(profile.avatar) ? profile.avatar : 'ghost';
      connect(profile.username, avatarToUse, user.id); // Pass userId for single session enforcement
    }
  }, [initialized, profile, user, isConnected, connect]);

  // Track when first connection is made
  useEffect(() => {
    if (isConnected && !hasConnectedOnce) {
      setHasConnectedOnce(true);
    }
  }, [isConnected, hasConnectedOnce]);

  // Reset password sayfası için özel handling - her zaman göster
  if (location.pathname === '/reset-password') {
    return <ResetPassword />;
  }

  // Single loading screen for ALL loading states
  // Shows until: auth initialized + profile loaded + FIRST socket connection
  // After first connection, don't show loading on reconnects or auth refreshes
  const isLoading = !hasConnectedOnce && (!initialized || loading || profileLoading || (profile && !isConnected));

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: `radial-gradient(circle at center, hsl(var(--gradient-start)) 0%, hsl(var(--gradient-end)) 100%)`
        }}
      >
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white font-heading font-black uppercase tracking-widest">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in → Auth page
  if (!user) {
    return <AuthPage />;
  }

  // Logged in but no profile → Profile setup
  if (!profile) {
    return <ProfileSetup />;
  }

  // Logged in with profile → App (even if temporarily disconnected)
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthWrapper />
    </BrowserRouter>
  </StrictMode>,
)

