import { Server } from 'socket.io';
import { publishMatchUpdate } from './redis.service.js';

interface MatchUpdate {
    matchId: string;
    score: {
        home: number;
        away: number;
    };
    status: 'LIVE' | 'COMPLETED';
    timestamp: number;
}

const matchScores = new Map<
    string,
    {
        home: number;
        away: number;
    }
>();

export const initializeSocketServer = (io: Server): void => {
    io.on('connection', (socket) => {
        const session = socket.data.session;

        console.log(
            `Authenticated socket connected: ${socket.id} (User: ${session?.userId ?? 'unknown'})`,
        );

        socket.on('match:join', (matchId: string) => {
            if (!matchId) {
                return;
            }

            const room = `match:${matchId}`;

            socket.join(room);

            if (!matchScores.has(matchId)) {
                matchScores.set(matchId, {
                    home: 0,
                    away: 0,
                });
            }

            console.log(`${socket.id} joined ${room}`);

            socket.emit('match:joined', {
                matchId,
                room,
            });
        });

        const checkCleanupRoom = (matchId: string) => {
            const room = `match:${matchId}`;
            const clients = io.sockets.adapter.rooms.get(room);
            if (!clients || clients.size === 0) {
                matchScores.delete(matchId);
                console.log(`Cleaned up empty match room state: ${room}`);
            }
        };

        socket.on('match:leave', (matchId: string) => {
            if (!matchId) {
                return;
            }

            const room = `match:${matchId}`;

            socket.leave(room);

            console.log(`${socket.id} left ${room}`);
            checkCleanupRoom(matchId);
        });

        socket.on('disconnect', (reason) => {
            console.log(
                `Socket disconnected: ${socket.id} - ${reason}`,
            );

            // Clean up any empty rooms for active matches
            for (const matchId of matchScores.keys()) {
                checkCleanupRoom(matchId);
            }
        });
    });
};

export const getActiveMatchIds = (): string[] => {
    return Array.from(matchScores.keys());
};

export const sendSampleMatchUpdate = async (
    matchId: string,
): Promise<void> => {
    const currentScore = matchScores.get(matchId);

    if (!currentScore) {
        return;
    }

    // Keep score increments realistic and bound scores
    if (Math.random() > 0.5) {
        currentScore.home = (currentScore.home + Math.floor(Math.random() * 3)) % 100;
    } else {
        currentScore.away = (currentScore.away + Math.floor(Math.random() * 3)) % 100;
    }

    const update: MatchUpdate = {
        matchId,
        score: {
            home: currentScore.home,
            away: currentScore.away,
        },
        status: 'LIVE',
        timestamp: Date.now(),
    };

    await publishMatchUpdate(matchId, update);
};