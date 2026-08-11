import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth.middleware.js';

export const requireRole = (
    role: 'ADMIN' | 'USER',
) => {
    return (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ): void => {
        if (!req.session) {
            res.status(401).json({
                message: 'Authentication required',
            });

            return;
        }

        if (req.session.role !== role) {
            res.status(403).json({
                message: 'Insufficient permissions',
            });

            return;
        }

        next();
    };
};