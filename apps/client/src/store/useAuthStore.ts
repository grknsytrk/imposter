import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface Profile {
    id: string;
    username: string;
    avatar: string;
    email?: string; // Login için email kaydı
    created_at: string;
}

interface AuthState {
    user: User | null;
    session: Session | null;
    profile: Profile | null;
    loading: boolean;
    profileLoading: boolean;
    signUp: (email: string, password: string, loginUsername: string) => Promise<{ error: Error | null }>;
    signIn: (emailOrUsername: string, password: string) => Promise<{ error: Error | null }>;
    signInWithGoogle: () => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    initialize: () => Promise<void>;
    fetchProfile: () => Promise<Profile | null>;
    createProfile: (username: string, avatar: string) => Promise<{ error: Error | null }>;
    checkUsernameAvailable: (username: string) => Promise<boolean>;
    checkLoginUsernameAvailable: (loginUsername: string) => Promise<boolean>;
    getEmailByLoginUsername: (loginUsername: string) => Promise<string | null>;
    resetPassword: (emailOrUsername: string) => Promise<{ error: Error | null }>;
    updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
    signInAnonymously: () => Promise<{ error: Error | null; guestName?: string }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    session: null,
    profile: null,
    loading: true,
    profileLoading: false,

    initialize: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        set({ session, user: session?.user ?? null, loading: false });

        // Profile'ı da yükle
        if (session?.user) {
            const profile = await get().fetchProfile();
            set({ profile });
        }

        supabase.auth.onAuthStateChange(async (_event, session) => {
            set({ session, user: session?.user ?? null });
            if (session?.user) {
                const profile = await get().fetchProfile();
                set({ profile });
            } else {
                set({ profile: null });
            }
        });
    },

    fetchProfile: async () => {
        const user = get().user;
        if (!user) return null;

        set({ profileLoading: true });
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        set({ profileLoading: false });

        if (error || !data) return null;
        return data as Profile;
    },

    createProfile: async (username: string, avatar: string) => {
        const user = get().user;
        if (!user) return { error: new Error('Not authenticated') };

        const { error } = await supabase
            .from('profiles')
            .insert({
                id: user.id,
                username: username.trim(),
                avatar,
                email: user.email // Email'i de kaydet
            });

        if (!error) {
            const profile = await get().fetchProfile();
            set({ profile });
        }

        return { error: error as Error | null };
    },

    checkUsernameAvailable: async (username: string) => {
        const { data } = await supabase
            .from('profiles')
            .select('username')
            .eq('username', username.trim().toLowerCase())
            .single();

        return !data; // true = available, false = taken
    },

    // Login username (sign up sırasında kullanılan) kontrolü
    checkLoginUsernameAvailable: async (loginUsername: string) => {
        const { data } = await supabase
            .from('profiles')
            .select('id')
            .ilike('username', loginUsername.trim())
            .single();

        return !data; // true = available, false = taken
    },

    // Username'den email bul (login için)
    getEmailByLoginUsername: async (loginUsername: string) => {
        const { data } = await supabase
            .from('profiles')
            .select('email')
            .ilike('username', loginUsername.trim())
            .single();

        return data?.email || null;
    },

    signUp: async (email: string, password: string, loginUsername: string) => {
        // Önce username'in müsait olup olmadığını kontrol et
        const isAvailable = await get().checkLoginUsernameAvailable(loginUsername);
        if (!isAvailable) {
            return { error: new Error('This username is already taken') };
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { login_username: loginUsername.trim() }
            }
        });

        // Kullanıcı oluşturulduysa, profili hemen oluştur (email confirmation beklemeden)
        // Not: Email confirmation aktifse bu çalışmayabilir
        if (!error && data.user) {
            // Profili email ile birlikte kaydet
            await supabase.from('profiles').insert({
                id: data.user.id,
                username: loginUsername.trim(),
                avatar: 'ghost', // Default avatar
                email: email
            });
        }

        return { error: error as Error | null };
    },

    signIn: async (emailOrUsername: string, password: string) => {
        let emailToUse = emailOrUsername;

        // Eğer @ içermiyorsa, username olarak kabul et ve email'i bul
        if (!emailOrUsername.includes('@')) {
            const email = await get().getEmailByLoginUsername(emailOrUsername);
            if (!email) {
                return { error: new Error('Username not found') };
            }
            emailToUse = email;
        }

        const { error } = await supabase.auth.signInWithPassword({
            email: emailToUse,
            password
        });
        return { error: error as Error | null };
    },

    signInWithGoogle: async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        return { error: error as Error | null };
    },

    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, session: null, profile: null });
    },

    resetPassword: async (emailOrUsername: string) => {
        let emailToUse = emailOrUsername;

        // Eğer @ içermiyorsa, username olarak kabul et ve email'i bul
        if (!emailOrUsername.includes('@')) {
            const email = await get().getEmailByLoginUsername(emailOrUsername);
            if (!email) {
                return { error: new Error('No account found with this username') };
            }
            emailToUse = email;
        }

        const { error } = await supabase.auth.resetPasswordForEmail(emailToUse, {
            redirectTo: `${window.location.origin}/reset-password`
        });
        return { error: error as Error | null };
    },

    updatePassword: async (newPassword: string) => {
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });
        return { error: error as Error | null };
    },

    signInAnonymously: async () => {
        // Set profileLoading to true BEFORE auth to prevent ProfileSetup flash
        set({ profileLoading: true });

        // Random guest name generator: <adjective><name><4-digit number>
        const adjectives = [
            'Sneaky', 'Clever', 'Mysterious', 'Shadow', 'Swift', 'Silent', 'Brave', 'Lucky', 'Crafty', 'Sly',
            'Crazy', 'Wild', 'Cool', 'Epic', 'Mighty', 'Dark', 'Fierce', 'Noble', 'Wise', 'Bold'
        ];
        const names = [
            'Mike', 'Alex', 'Sam', 'Max', 'Jack', 'Leo', 'Finn', 'Ace', 'Zack', 'Cole',
            'Jake', 'Ryan', 'Nick', 'Evan', 'Luke', 'Adam', 'Noah', 'Ethan', 'Owen', 'Kyle'
        ];
        const randomNum = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
        const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomName = names[Math.floor(Math.random() * names.length)];
        const guestName = `${randomAdj}${randomName}${randomNum}`;

        try {
            const { data, error } = await supabase.auth.signInAnonymously();

            if (!error && data.user) {
                // Create a guest profile
                await supabase.from('profiles').upsert({
                    id: data.user.id,
                    username: guestName,
                    avatar: 'ghost',
                    email: null // Guest has no email
                });

                const profile = await get().fetchProfile();
                set({ profile, profileLoading: false });
            } else {
                set({ profileLoading: false });
            }

            return { error: error as Error | null, guestName: error ? undefined : guestName };
        } catch (err) {
            set({ profileLoading: false });
            return { error: err as Error, guestName: undefined };
        }
    }
}));
