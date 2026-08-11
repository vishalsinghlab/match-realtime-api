import type { RedisClientType } from 'redis';

import { MatchSettings } from '../matches/match-settings.model.js';
import { publishMatchUpdate } from './redis.service.js';

interface MatchData {
    matchId: string;
    timestamp: number;
    score: {
        home: number;
        away: number;
    };
    status: 'LIVE' | 'PAUSED' | 'FINISHED';
}

export class RealtimePublisher {
    private timers = new Map<string, NodeJS.Timeout>();

    constructor(
        private readonly redis: RedisClientType,
    ) { }

    async start(matchId: string): Promise<void> {
        if (this.timers.has(matchId)) {
            return;
        }

        const settings =
            await MatchSettings.findOne({
                matchId,
            }).lean();

        if (!settings) {
            throw new Error(
                `Settings not found for match ${matchId}`,
            );
        }

        if (!settings.socketEnabled) {
            console.log(
                `Socket disabled for match ${matchId}`,
            );

            return;
        }

        const publish = async () => {
            const currentSettings =
                await MatchSettings.findOne({
                    matchId,
                }).lean();

            if (!currentSettings?.socketEnabled) {
                this.stop(matchId);

                return;
            }

            const data = this.generateMatchData(
                matchId,
            );

            await publishMatchUpdate(matchId, data);
        };

        await publish();

        const timer = setInterval(
            publish,
            settings.updateInterval,
        );

        this.timers.set(matchId, timer);

        console.log(
            `Realtime publisher started for ${matchId}`,
        );
    }

    stop(matchId: string): void {
        const timer = this.timers.get(matchId);

        if (!timer) {
            return;
        }

        clearInterval(timer);

        this.timers.delete(matchId);

        console.log(
            `Realtime publisher stopped for ${matchId}`,
        );
    }

    private generateMatchData(
        matchId: string,
    ): MatchData {
        return {
            matchId,
            timestamp: Date.now(),
            score: {
                home: Math.floor(Math.random() * 200),
                away: Math.floor(Math.random() * 200),
            },
            status: 'LIVE',
        };
    }
}