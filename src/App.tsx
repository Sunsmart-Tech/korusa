/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppLayout } from './components/layout/AppLayout';
import { supabase } from './lib/supabase';
import { AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';
import { AuthUI } from './components/features/auth/Auth';
import { LandingView } from './components/features/auth/LandingView';
import { ProtectedRoute } from './components/features/auth/ProtectedRoute';
import { PublicRoute } from './components/auth/RouteGuard';
import { useUIStore } from './store/uiStore';
import { ResetPasswordView } from './components/features/auth/ResetPasswordView';

import { ExploreView } from './components/features/content/Explore';
import { SparksView } from './components/features/content/Sparks';
import { LearnView } from './components/features/learning/Learn';
import { LearningExperience } from './components/features/learning/LearningExperience';
import { MessagesView } from './components/features/chat/Messages';
import { NotificationsView } from './components/features/notifications/Notifications';
import { ProfileView } from './components/features/profile/Profile';
import { ProfileEditor } from './components/features/profile/ProfileEditor';
import { FollowListView } from './components/features/profile/FollowListView';
import { SettingsView } from './components/features/settings/Settings';
import { CreateView } from './components/features/content/Create';
import { ChatAssistantView } from './components/features/chat/ChatAssistant';
import { HomeView } from './components/views/HomeView';
import { AnalyticsView } from './components/features/analytics/Analytics';

export default function App() {
  const {
    isAuthenticated,
    setAuthenticated,
    isDarkMode,
    showAuthModal,
    setShowAuthModal,
  } = useUIStore();

  const navigate = useNavigate();
  const [authReady, setAuthReady] = useState(false);

  // True while the user is inside a password-recovery session (opened the emailed
  // reset link). Takes priority over normal routing until they set a new password.
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (error) {
        console.error('Failed to restore Supabase session:', error.message);
        setAuthenticated(false);
      } else {
        setAuthenticated(!!data.session);
      }

      setAuthReady(true);
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      // The reset link signs the user in, so without this flag they would be sent
      // straight to /home and never be asked for a new password.
      if (_event === 'PASSWORD_RECOVERY') setIsRecovering(true);
      setAuthenticated(!!session);
      setAuthReady(true);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [setAuthenticated]);

  const onAuthSuccess = () => {
    setAuthenticated(true);
    setShowAuthModal(false);
    navigate('/home');
  };

  const onSignOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Failed to sign out:', error.message);
      return;
    }

    setAuthenticated(false);
    setShowAuthModal(false);
    navigate('/');
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-sun-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-4 border-sun-primary/20 border-t-sun-primary animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-sun-text-muted">
            Restoring Session
          </p>
        </div>
      </div>
    );
  }

  // Recovery takes over the whole screen until the new password is saved.
  if (isRecovering) {
    return <ResetPasswordView onDone={() => { setIsRecovering(false); navigate('/home'); }} />
  }

  return (
    <div className="relative">
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute isAuthenticated={isAuthenticated}>
              <LandingView />
            </PublicRoute>
          }
        />

        <Route
          path="/login"
          element={
            <PublicRoute isAuthenticated={isAuthenticated}>
              <LandingView />
            </PublicRoute>
          }
        />

        <Route
          path="/signup"
          element={
            <PublicRoute isAuthenticated={isAuthenticated}>
              <LandingView />
            </PublicRoute>
          }
        />

        <Route
          path="/forgot-password"
          element={
            <PublicRoute isAuthenticated={isAuthenticated}>
              <LandingView />
            </PublicRoute>
          }
        />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout onSignOut={onSignOut} />
            </ProtectedRoute>
          }
        >
          <Route path="home" element={<HomeView />} />

          <Route
            path="explore"
            element={<ExploreView onBack={() => navigate('/home')} />}
          />

          <Route path="sparks" element={<SparksView />} />

          <Route
            path="learn"
            element={
              <LearnView
                onStartLearning={() => navigate('/learning')}
                onBack={() => navigate('/home')}
              />
            }
          />

          <Route
            path="learning"
            element={
              <LearningExperience onBack={() => navigate('/learn')} />
            }
          />

          <Route
            path="messages"
            element={<MessagesView onBack={() => navigate('/home')} />}
          />

          <Route
            path="notifications"
            element={
              <NotificationsView
                onBack={() => navigate('/home')}
                onExploreClick={() => navigate('/explore')}
              />
            }
          />

          {/* Listed before profile/:id for legibility. React Router already ranks a
              static segment above a dynamic one, so "edit" is never read as a handle. */}
          <Route
            path="profile/edit"
            element={<ProfileEditor onBack={() => navigate('/profile/me')} />}
          />

          {/* Real routes rather than component state, so a refresh, a deep link and the
              browser's own Back button all behave. As a subview these dropped you out of
              the profile entirely. */}
          <Route
            path="profile/:id/followers"
            element={<FollowListView direction="followers" />}
          />

          <Route
            path="profile/:id/following"
            element={<FollowListView direction="following" />}
          />

          <Route
            path="profile/:id"
            element={
              <ProfileView
                onBack={() => navigate('/home')}
                onSettingsClick={() => navigate('/settings')}
              />
            }
          />

          <Route
            path="settings"
            element={
              <SettingsView onBack={() => navigate('/profile/me')} />
            }
          />

          <Route
            path="create"
            element={<CreateView onBack={() => navigate('/home')} />}
          />

          <Route
            path="assistant"
            element={
              <ChatAssistantView onBack={() => navigate('/home')} />
            }
          />

          <Route
            path="analytics"
            element={<AnalyticsView onBack={() => navigate('/home')} />}
          />

          <Route path="*" element={<Navigate to="/home" replace />} />
        </Route>
      </Routes>

      <AnimatePresence>
        {showAuthModal && (
          <AuthUI
            isModal={true}
            onSuccess={onAuthSuccess}
            onClose={() => setShowAuthModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}