import crypto from 'node:crypto';

interface User {
    id: string;
    username: string;
    password: string;
    role: 'ADMIN' | 'USER';
}

export interface Session {
    id: string;
    userId: string;
    role: User['role'];
    expiresAt: number;
}

const users: User[] = [
    {
        id: 'user-1',
        username: 'user',
        password: 'password123',
        role: 'USER',
    },
    {
        id: 'admin-1',
        username: 'admin',
        password: 'admin123',
        role: 'ADMIN',
    },
];

const sessions = new Map<string, Session>();

const SESSION_DURATION = 1000 * 60 * 60;

// Periodically clean up expired sessions every 15 minutes
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of sessions.entries()) {
        if (session.expiresAt < now) {
            sessions.delete(sessionId);
        }
    }
}, 15 * 60 * 1000);

export const authenticateUser = (
    username: string,
    password: string,
): User | null => {
    return (
        users.find(
            (user) =>
                user.username === username &&
                user.password === password,
        ) ?? null
    );
};

export const createSession = (
    user: User,
): Session => {
    const session: Session = {
        id: crypto.randomBytes(32).toString('hex'),
        userId: user.id,
        role: user.role,
        expiresAt: Date.now() + SESSION_DURATION,
    };

    sessions.set(session.id, session);

    return session;
};

export const getSession = (
    sessionId: string,
): Session | null => {
    const session = sessions.get(sessionId);

    if (!session) {
        return null;
    }

    if (session.expiresAt < Date.now()) {
        sessions.delete(sessionId);

        return null;
    }

    return session;
};

export const deleteSession = (
    sessionId: string,
): void => {
    sessions.delete(sessionId);
};