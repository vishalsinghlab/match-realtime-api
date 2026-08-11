import { Router } from 'express';

import {
    login,
    logout,
} from './auth.controller.js';

import { requireAuth } from './auth.middleware.js';
import type { AuthenticatedRequest } from './auth.middleware.js';

export const authRouter = Router();

authRouter.post('/login', login);

authRouter.post(
    '/logout',
    requireAuth,
    logout,
);

authRouter.get(
    '/me',
    requireAuth,
    (req: AuthenticatedRequest, res) => {
        res.json({
            authenticated: true,
            session: req.session,
        });
    },
);