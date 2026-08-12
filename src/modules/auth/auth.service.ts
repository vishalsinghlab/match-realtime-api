import crypto from 'node:crypto';
import { UserModel } from './user.model.js';
import { saveSessionInRedis, getSessionFromRedis, deleteSessionFromRedis } from '../realtime/redis.service.js';

export interface User {
    id: string;
    username: string;
    role: 'ADMIN' | 'USER';
}

export interface Session {
    id: string;
    userId: string;
    role: User['role'];
    expiresAt: number;
}

const fallbackUsers = [
    { id: 'user-1', username: 'user', password: 'password123', role: 'USER' as const },
    { id: 'admin-1', username: 'admin', password: 'admin123', role: 'ADMIN' as const },
];

const fallbackSessions = new Map<string, Session>();
const SESSION_DURATION = 1000 * 60 * 60;

export const seedDefaultUsers = async (): Promise<void> => {
    try {
        const count = await UserModel.countDocuments();
        if (count === 0) {
            await UserModel.create([
                { username: 'user', password: 'password123', role: 'USER' },
                { username: 'admin', password: 'admin123', role: 'ADMIN' },
            ]);
            console.log('Seeded default admin and user credentials into database');
        }
    } catch (err) {
        console.error('Failed to seed default users:', err);
    }
};

export const authenticateUserAsync = async (
    username: string,
    password: string,
): Promise<User | null> => {
    try {
        const userDoc = await UserModel.findOne({ username: username.toLowerCase() }).lean();
        if (userDoc && userDoc.password === password) {
            return {
                id: userDoc._id.toString(),
                username: userDoc.username,
                role: userDoc.role as 'ADMIN' | 'USER',
            };
        }
    } catch (err) {
        console.error('DB Auth error, falling back:', err);
    }

    const fallback = fallbackUsers.find(
        (u) => u.username === username && u.password === password,
    );
    if (!fallback) return null;
    return { id: fallback.id, username: fallback.username, role: fallback.role };
};

export const createSessionAsync = async (user: User): Promise<Session> => {
    const session: Session = {
        id: crypto.randomBytes(32).toString('hex'),
        userId: user.id,
        role: user.role,
        expiresAt: Date.now() + SESSION_DURATION,
    };

    fallbackSessions.set(session.id, session);
    try {
        await saveSessionInRedis(session, 3600);
    } catch (err) {
        console.error('Failed to save session in Redis:', err);
    }
    return session;
};

export const getSessionAsync = async (sessionId: string): Promise<Session | null> => {
    try {
        const redisSession = await getSessionFromRedis(sessionId);
        if (redisSession) {
            if (redisSession.expiresAt < Date.now()) {
                await deleteSessionFromRedis(sessionId);
                return null;
            }
            return redisSession;
        }
    } catch (err) {
        console.error('Failed to get session from Redis:', err);
    }

    const local = fallbackSessions.get(sessionId);
    if (!local) return null;
    if (local.expiresAt < Date.now()) {
        fallbackSessions.delete(sessionId);
        return null;
    }
    return local;
};

export const deleteSessionAsync = async (sessionId: string): Promise<void> => {
    fallbackSessions.delete(sessionId);
    try {
        await deleteSessionFromRedis(sessionId);
    } catch (err) {
        console.error('Failed to delete session from Redis:', err);
    }
};

export const getSession = (sessionId: string): Session | null => {
    const local = fallbackSessions.get(sessionId);
    if (!local) return null;
    if (local.expiresAt < Date.now()) {
        fallbackSessions.delete(sessionId);
        return null;
    }
    return local;
};

export const authenticateUser = (username: string, password: string) => {
    const fallback = fallbackUsers.find((u) => u.username === username && u.password === password);
    if (!fallback) return null;
    return { id: fallback.id, username: fallback.username, role: fallback.role };
};

export const createSession = (user: User): Session => {
    const session: Session = {
        id: crypto.randomBytes(32).toString('hex'),
        userId: user.id,
        role: user.role,
        expiresAt: Date.now() + SESSION_DURATION,
    };
    fallbackSessions.set(session.id, session);
    saveSessionInRedis(session, 3600).catch(() => {});
    return session;
};

export const deleteSession = (sessionId: string): void => {
    fallbackSessions.delete(sessionId);
    deleteSessionFromRedis(sessionId).catch(() => {});
};