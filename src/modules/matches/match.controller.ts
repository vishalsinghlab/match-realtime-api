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