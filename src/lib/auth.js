import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      setReady(true);
      return null;
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    let extra = {};
    if (data?.role === 'candidate') {
      const { data: cp } = await supabase
        .from('candidate_profiles').select('*').eq('user_id', userId).maybeSingle();
      extra.candidate = cp;
    } else if (data?.role === 'employer') {
      const { data: company } = await supabase
        .from('companies').select('*').eq('owner_id', userId).maybeSingle();
      extra.company = company;
    }
    const full = data ? { ...data, ...extra } : null;
    setProfile(full);
    setReady(true);
    return full;
  }, []);

  const userId = session?.user?.id;
  useEffect(() => {
    if (userId) loadProfile(userId);
    else if (session === null) loadProfile(null);
  }, [userId, session, loadProfile]);

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    ready,
    refreshProfile: () => loadProfile(userId),
    signOut: () => supabase.auth.signOut(),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
