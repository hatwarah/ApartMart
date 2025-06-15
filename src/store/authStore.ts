import { create } from 'zustand';
import { supabase, Profile, UserRole } from '../lib/supabase';

interface AuthState {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, userData?: Partial<Profile>) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        set({ user: session.user, profile, loading: false });
      } else {
        set({ user: null, profile: null, loading: false });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          set({ user: session.user, profile });
        } else {
          set({ user: null, profile: null });
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ loading: false });
    }
  },

  signIn: async (email, password) => {
    try {
      // Check for default admin credentials
      if (email === 'admin' && password === 'admin123') {
        // Try to sign in with admin@apartmart.com
        const { data, error } = await supabase.auth.signInWithPassword({
          email: 'admin@apartmart.com',
          password: 'admin123'
        });

        if (error && error.message.includes('Invalid login credentials')) {
          // Create default admin account
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: 'admin@apartmart.com',
            password: 'admin123'
          });

          if (signUpError) return { error: signUpError };

          if (signUpData.user) {
            // Create admin profile
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: signUpData.user.id,
                email: 'admin@apartmart.com',
                username: 'admin',
                full_name: 'System Administrator',
                role: 'admin' as UserRole
              });

            if (profileError) console.error('Profile creation error:', profileError);
          }

          // Sign in again
          return await supabase.auth.signInWithPassword({
            email: 'admin@apartmart.com',
            password: 'admin123'
          });
        }

        return { data, error };
      }

      // Regular email/password sign in
      return await supabase.auth.signInWithPassword({ email, password });
    } catch (error) {
      return { error };
    }
  },

  signUp: async (email, password, userData = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) return { error };

      if (data.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email,
            role: 'customer' as UserRole,
            ...userData
          });

        if (profileError) return { error: profileError };
      }

      return { data, error: null };
    } catch (error) {
      return { error };
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },

  updateProfile: async (updates) => {
    const { profile } = get();
    if (!profile) return { error: new Error('No profile found') };

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id)
      .select()
      .single();

    if (!error && data) {
      set({ profile: data });
    }

    return { error };
  }
}));