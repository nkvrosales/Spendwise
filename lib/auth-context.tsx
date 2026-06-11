"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  username: string | null;
  login: (username: string, password: string) => Promise<string | null>;
  signup: (username: string, email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchUsername = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("username")
      .eq("user_id", userId)
      .single();
    if (data) setUsername(data.username);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) fetchUsername(u.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) fetchUsername(u.id);
      else setUsername(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (username: string, password: string): Promise<string | null> => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("username", username)
      .single();

    if (!profile) return "Username not found";

    const { error } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password,
    });
    return error?.message ?? null;
  };

  const signup = async (username: string, email: string, password: string): Promise<string | null> => {
    const { data: existing } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", username)
      .single();

    if (existing) return "Username already taken";

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return error.message;
    if (!data.user) return "Sign up failed";

    const { error: profileError } = await supabase.from("profiles").insert({
      username,
      email,
      user_id: data.user.id,
    });

    return profileError?.message ?? null;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, username, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
