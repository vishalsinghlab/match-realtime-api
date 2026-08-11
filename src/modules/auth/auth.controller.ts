import type { Request, Response } from 'express';

import {
    authenticateUser,
    createSession,
    deleteSession,
} from './auth.service.js';

export const login = (
    req: Request,
    res: Response,
): void => {
    const { username, password } = req.body;

    if (
        typeof username !== 'string' ||
        typeof password !== 'string'
    ) {
        res.status(400).json({
            message: 'Username and password are required',
        });

        return;
    }

    const user = authenticateUser(
        username,
        password,
    );

    if (!user) {
        res.status(401).json({
            message: 'Invalid credentials',
        });

        return;
    }

    const session = createSession(user);

    res.cookie('session', session.id, {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: 1000 * 60 * 60,
    });

    res.json({
        user: {
            id: user.id,
            username: user.username,
            role: user.role,
        },
    });
};

export const logout = (
    req: Request,
    res: Response,
): void => {
    const sessionId = req.cookies.session;

    if (sessionId) {
        deleteSession(sessionId);
    }

    res.clearCookie('session');

    res.json({
        message: 'Logged out successfully',
    });
};