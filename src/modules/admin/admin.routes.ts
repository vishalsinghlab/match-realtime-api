import { Router } from 'express';

import { requireAuth } from '../auth/auth.middleware.js';
import { requireRole } from '../auth/role.middleware.js';
import {
    getSettings,
    updateSettings,
    getGlobalSettingsCtrl,
    updateGlobalSettingsCtrl,
} from './match-settings.controller.js';

export const adminRouter = Router();

adminRouter.use(requireAuth);
adminRouter.use(requireRole('ADMIN'));

adminRouter.get('/test', (_req, res) => {
    res.json({
        message: 'Admin endpoint accessible',
    });
});

adminRouter.get('/settings/global', getGlobalSettingsCtrl);
adminRouter.put('/settings/global', updateGlobalSettingsCtrl);

adminRouter.get(
    '/matches/:matchId/settings',
    getSettings,
);

adminRouter.put(
    '/matches/:matchId/settings',
    updateSettings,
);