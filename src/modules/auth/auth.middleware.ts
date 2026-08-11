import type {
    NextFunction,
    Request,
    Response,
} from 'express';

import { getSession } from './auth.service.js';

export interface AuthenticatedRequest
    extends Request {
    session?: ReturnType<typeof getSession>;
}

export const requireAuth = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
): void => {
    const sessionId = req.cookies.session;

    if (!sessionId) {
        res.status(401).json({
            message: 'Authentication required',
        });

        return;
    }

    const session = getSession(sessionId);

    if (!session) {
        res.status(401).json({
            message: 'Invalid or expired session',
        });

        return;
    }

    req.session = session;

    next();
};