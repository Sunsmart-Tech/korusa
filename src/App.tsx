/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppLayout } from './components/layout/AppLayout';
import { supabase } from './lib/supabase';
import { AnimatePresence } from 'motion/react';
import { lazy, Suspense, useEffect, useState } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';
import { ProtectedRoute } from './components/features/auth/ProtectedRoute';
import { PublicRoute } from './components/auth/RouteGuard';
import { useUIStore } from './store/uiStore';

const AuthUI = lazy(() =>
  import('./components/features/auth/Auth').then(({ AuthUI }) => ({
    default: AuthUI,
  })),
);
const LandingView = lazy(() =>
  import('./components/features/auth/LandingView').then(({ LandingView }) => ({
    default: LandingView,
  })),
);
const ExploreView = lazy(() =>
  import('./components/features/content/Explore').then(({ ExploreView }) => ({
    default: ExploreView,
  })),
);
const SparksView = lazy(() =>
  import('./components/features/content/Sparks').then(({ SparksView }) => ({
    default: SparksView,
  })),
);
const LearnView = lazy(() =>
  import('./components/features/learning/Learn').then(({ LearnView }) => ({
    default: LearnView,
  })),
);
const LearningExperience = lazy(() =>
  import('./components/features/learning/LearningExperience').then(
    ({ LearningExperience }) => ({ default: LearningExperience }),
  ),
);
const MessagesView = lazy(() =>
  import('./components/features/chat/Messages').then(({ MessagesView }) => ({
    default: MessagesView,
  })),
);
const NotificationsView = lazy(() =>
  import('./components/features/notifications/Notifications').then(
    ({ NotificationsView }) => ({ default: NotificationsView }),
  ),
);
const ProfileView = lazy(() =>
  import('./components/features/profile/Profile').then(({ ProfileView }) => ({
    default: ProfileView,
  })),
);
const ProfileEditor = lazy(() =>
  import('./components/features/profile/ProfileEditor').then(
    ({ ProfileEditor }) => ({ default: ProfileEditor }),
  ),
);
const FollowListView = lazy(() =>
  import('./components/features/profile/FollowListView').then(
    ({ FollowListView }) => ({ default: FollowListView }),
  ),
);
const SettingsView = lazy(() =>
  import('./components/features/settings/Settings').then(({ SettingsView }) => ({
    default: SettingsView,
  })),
);
const CreateView = lazy(() =>
  import('./components/features/content/Create').then(({ CreateView }) => ({
    default: CreateView,
  })),
);
const ChatAssistantView = lazy(() =>
  import('./components/features/chat/ChatAssistant').then(
    ({ ChatAssistantView }) => ({ default: ChatAssistantView }),
  ),
);
const HomeView = lazy(() =>
  import('./components/views/HomeView').then(({ HomeView }) => ({
    default: HomeView,
  })),
);
const AnalyticsView = lazy(() =>
  import('./components/features/analytics/Analytics').then(
    ({ AnalyticsView }) => ({ default: AnalyticsView }),
  ),
);

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

  return (
    <div className="relative">
      <Suspense
        fallback={
          <div className="min-h-screen bg-sun-bg flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-4 border-sun-primary/20 border-t-sun-primary animate-spin" />
          </div>
        }
      >
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
      </Suspense>

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