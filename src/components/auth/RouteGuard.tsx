import React from "react";
import { Navigate, useLocation } from "react-router-dom";

// NOTE: the guard for logged-in-only routes is ProtectedRoute in
// features/auth/ProtectedRoute.tsx (it reads auth state from the store).
// A second, unused copy used to live in this file and was removed to avoid confusion.

interface PublicRouteProps {
    isAuthenticated: boolean;
    children: React.ReactNode;
    redirectTo?: string;
}

// Routes for looged-out visitors (landing, login, signup, forgot-password).
// Logged-in users are redirect away from them.
export const PublicRoute: React.FC<PublicRouteProps> = ({
    isAuthenticated,
    children,
    redirectTo= '/home',
}) => {
    const location = useLocation();

    if(isAuthenticated) {
        // ProtectedRoute stores the page the user originally wanted in `state.from`
        // before sending them to /login. Send them back there after login.
        // Only same-app paths are accepted (must start with a single "/"), so this can
        // never become a redirect to another site.  
        const from = (location.state as { from?: { pathname?: string, search?: string; hash?: string } } | null)?.from;
        const path = from?.pathname;
        const isSafePath = !!path && path.startsWith('/') && !path.startsWith('//');
        // Never bounce back onto a public page such as /login, which would loop.
        const isPublicPage = ['/', '/signup', '/forgot-password'].includes(path ?? '');

        const target = 
            isSafePath && !isPublicPage
                ? `${path}${from?.search ?? ''}${from?.hash ?? ''}`
                : redirectTo;

        return <Navigate to={target} replace />
    }

    return <>{children}</>;
};