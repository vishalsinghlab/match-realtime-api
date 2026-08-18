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

        if (!name || !sport || !startTime) {
            res.status(400).json({
                success: false,
                message: "Name, sport, and startTime are required.",
            });
            return;
        }

        const startDate = new Date(startTime);
        if (isNaN(startDate.getTime())) {
            res.status(400).json({
                success: false,
                message: "Invalid start date and time format.",
            });
            return;
        }

        const now = new Date();
        const initialStatus = status || "UPCOMING";

        // Validate initial status vs startTime relationship
        if (initialStatus === "UPCOMING") {
            // Allow 5 minutes grace period for clock skew; UPCOMING must be present or future
            const minAllowedTime = new Date(now.getTime() - 5 * 60 * 1000);
            if (startDate < minAllowedTime) {
                res.status(400).json({
                    success: false,
                    message: "An UPCOMING fixture must have a start time in the present or future.",
                });
                return;
            }
        } else if (initialStatus === "COMPLETED") {
            // COMPLETED match must have a start time in the past or present
            if (startDate > now) {
                res.status(400).json({
                    success: false,
                    message: "A COMPLETED fixture cannot have a start time in the future.",
                });
                return;
            }
        } else if (initialStatus === "LIVE") {
            // LIVE match start time cannot be scheduled far in the future
            const maxLiveFuture = new Date(now.getTime() + 30 * 60 * 1000);
            if (startDate > maxLiveFuture) {
                res.status(400).json({
                    success: false,
                    message: "A LIVE fixture cannot be scheduled far in the future.",
                });
                return;
            }
        }

        const match = await MatchModel.create({
            name,
            sport,
            status: initialStatus,
            startTime: startDate,
            socketEnabled: socketEnabled ?? true,
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