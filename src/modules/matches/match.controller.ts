import type { Request, Response } from "express";
import { MatchModel } from "./match.model.js";

export const getMatches = async (
    _req: Request,
    res: Response,
): Promise<void> => {
    try {
        const matches = await MatchModel.find()
            .sort({ startTime: 1 })
            .lean();

        res.json({
            success: true,
            data: matches,
        });
    } catch (error) {
        console.error("Failed to fetch matches:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch matches",
        });
    }
};

export const getMatchById = async (
    req: Request,
    res: Response,
): Promise<void> => {
    try {
        const rawId = req.params.matchId;
        const matchId = Array.isArray(rawId) ? rawId[0] : rawId;
        if (!matchId) {
            res.status(400).json({
                success: false,
                message: "Match ID is required",
            });
            return;
        }

        const match = await MatchModel.findById(matchId).lean();
        if (!match) {
            res.status(404).json({
                success: false,
                message: "Match not found",
            });
            return;
        }

        res.json({
            success: true,
            data: match,
        });
    } catch (error) {
        console.error("Failed to fetch match:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch match",
        });
    }
};

export const createMatch = async (
    req: Request,
    res: Response,
): Promise<void> => {
    try {
        const { name, sport, status, startTime, socketEnabled } = req.body;

        const match = await MatchModel.create({
            name,
            sport,
            status,
            startTime,
            socketEnabled,
        });

        res.status(201).json({
            success: true,
            data: match,
        });
    } catch (error) {
        console.error("Failed to create match:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create match",
        });
    }
};