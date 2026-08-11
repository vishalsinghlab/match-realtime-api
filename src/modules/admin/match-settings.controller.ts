import type { Request, Response } from 'express';

import {
    getMatchSettings,
    updateMatchSettings,
} from './match-settings.service.js';

export const getSettings = async (
    req: Request,
    res: Response,
): Promise<void> => {
    try {
        const rawMatchId = req.params.matchId;
        const matchId = Array.isArray(rawMatchId) ? rawMatchId[0] : rawMatchId;
        if (!matchId) {
            res.status(400).json({ message: 'matchId is required' });
            return;
        }

        const settings =
            await getMatchSettings(matchId);

        if (!settings) {
            res.status(404).json({
                message: 'Match settings not found',
            });

            return;
        }

        res.json(settings);
    } catch (error) {
        console.error(
            'Failed to get match settings:',
            error,
        );

        res.status(500).json({
            message: 'Failed to get match settings',
        });
    }
};

export const updateSettings = async (
    req: Request,
    res: Response,
): Promise<void> => {
    try {
        const rawMatchId = req.params.matchId;
        const matchId = Array.isArray(rawMatchId) ? rawMatchId[0] : rawMatchId;
        if (!matchId) {
            res.status(400).json({ message: 'matchId is required' });
            return;
        }

        const settings =
            await updateMatchSettings(
                matchId,
                req.body,
            );

        res.json(settings);
    } catch (error) {
        console.error(
            'Failed to update match settings:',
            error,
        );

        res.status(500).json({
            message: 'Failed to update match settings',
        });
    }
};