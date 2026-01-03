/**
 * Socket.IO Authentication Middleware
 * 
 * Verifies Supabase JWT tokens and binds userId immutably to socket.
 * Supports both authenticated users and anonymous guests.
 */

import { createClient } from '@supabase/supabase-js';
import { Socket } from 'socket.io';

// Initialize Supabase client with service role for JWT verification
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SERVICE_ROLE_KEY || '';

const supabase = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

/**
 * Extended Socket interface with verified authentication data.
 * userId is immutable after middleware runs.
 */
export interface AuthenticatedSocket extends Socket {
    userId: string | null;      // Verified Supabase user ID (null for guests)
    isAnonymous: boolean;       // true for guests or anonymous Supabase users
}

export interface AuthResult {
    userId: string | null;
    isAnonymous: boolean;
    error?: string;
}

/**
 * Verifies JWT token from socket handshake.
 * Returns verified userId or null for guests.
 */
export async function verifySocketAuth(socket: Socket): Promise<AuthResult> {
    // No Supabase configured = all guests
    if (!supabase) {
        console.warn('[Auth] Supabase not configured, all connections are guests');
        return { userId: null, isAnonymous: true };
    }

    const token = socket.handshake.auth?.token;

    // No token = guest mode (allowed)
    if (!token) {
        return { userId: null, isAnonymous: true };
    }

    try {
        // Verify token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.warn('[Auth] Invalid token from socket:', socket.id, error?.message);
            return { userId: null, isAnonymous: true, error: 'Invalid token' };
        }

        return {
            userId: user.id,
            isAnonymous: user.is_anonymous ?? false
        };
    } catch (err) {
        console.error('[Auth] Token verification failed:', err);
        return { userId: null, isAnonymous: true, error: 'Auth failed' };
    }
}

/**
 * Socket.IO middleware that runs on every connection.
 * Verifies JWT and binds userId immutably to socket.
 */
export async function authMiddleware(
    socket: Socket,
    next: (err?: Error) => void
): Promise<void> {
    try {
        const auth = await verifySocketAuth(socket);

        // Bind userId to socket (will be immutable)
        const authSocket = socket as AuthenticatedSocket;
        authSocket.userId = auth.userId;
        authSocket.isAnonymous = auth.isAnonymous;

        // Make userId immutable - can't be changed after connection
        Object.defineProperty(authSocket, 'userId', {
            value: auth.userId,
            writable: false,
            configurable: false
        });

        if (auth.userId) {
            console.log(`[Auth] Verified user: ${auth.userId} (anonymous: ${auth.isAnonymous})`);
        } else {
            console.log(`[Auth] Guest connection: ${socket.id}`);
        }

        next();
    } catch (err) {
        console.error('[Auth] Middleware error:', err);
        // Allow connection but as guest
        const authSocket = socket as AuthenticatedSocket;
        authSocket.userId = null;
        authSocket.isAnonymous = true;
        next();
    }
}
