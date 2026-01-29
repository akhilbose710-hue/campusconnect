import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    // Check active sessions and sets the user
    console.log('AuthContext: Initializing...');
    supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
      console.log('AuthContext: GetSession found:', activeSession?.user?.email);
      setSession(activeSession);
      setUser(activeSession?.user ?? null);
      if (activeSession?.user) {
        const tokenRoles = activeSession.user.app_metadata?.roles;
        if (tokenRoles && Array.isArray(tokenRoles) && tokenRoles.length > 0) {
          setRoles(tokenRoles);
          setLoading(false);
        } else {
          fetchRoles(activeSession.user.id);
        }
      } else {
        setLoading(false);
      }
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('AuthContext: AuthStateChange:', event, currentSession?.user?.email);

      if (currentSession?.user) {
        setSession(currentSession);
        setUser(currentSession.user);

        // OPTIMIZATION: Check if roles are already in the token (app_metadata)
        // This avoids DB calls and RLS issues!
        const tokenRoles = currentSession.user.app_metadata?.roles;
        if (tokenRoles && Array.isArray(tokenRoles) && tokenRoles.length > 0) {
          console.log('AuthContext: Roles found in token:', tokenRoles);
          setRoles(tokenRoles);
          setLoading(false);
        } else {
          // Fallback to DB if not in token
          await fetchRoles(currentSession.user.id);
        }
      } else {
        // No user
        setSession(null);
        setUser(null);
        setRoles([]);
        setLoading(false);
      }
    });

    // Safety timeout: stop loading after 5 seconds no matter what
    const timer = setTimeout(() => {
      console.warn('AuthContext: Loading timed out, forcing render.');
      setLoading(false);
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function fetchRoles(userId) {
    console.log('AuthContext: Fetching roles for', userId);
    try {
      // Query public.users directly via Supabase
      const { data, error } = await supabase
        .from('users')
        .select('roles')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('AuthContext: Error fetching roles from DB:', error);
        // Even if error, we must stop loading
      } else {
        console.log('AuthContext: Roles fetched:', data?.roles);
        setRoles(data?.roles || []);
      }
    } catch (error) {
      console.error('AuthContext: Critical Error fetching roles:', error);
    } finally {
      console.log('AuthContext: Finished loading');
      setLoading(false);
    }
  }

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    // Immediately clear local state so UI updates instantly
    setSession(null);
    setUser(null);
    setRoles([]);
    setLoading(false);

    // Perform Supabase signout in background
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = useMemo(
    () => ({
      user,
      session,
      roles,
      loading,
      login,
      logout
    }),
    [user, session, roles, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}


