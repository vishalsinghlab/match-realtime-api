import { MatchSettings } from '../matches/match-settings.model.js';
import { GlobalSettings } from '../admin/global-settings.model.js';
import { publishMatchUpdate, subscribeToConfigUpdates } from './redis.service.js';

interface MatchData {
    matchId: string;
    timestamp: number;
    score: {
        home: number;
        away: number;
    };
    status: 'LIVE' | 'PAUSED' | 'FINISHED';
    dataType?: 'SCORE' | 'FULL' | 'STATISTICS';
    meta?: Record<string, unknown>;
}

export class RealtimePublisher {
    private timers = new Map<string, NodeJS.Timeout>();
    private scores = new Map<string, { home: number; away: number }>();
    private isListeningConfig = false;

    initConfigListener(): void {
        if (this.isListeningConfig) return;
        this.isListeningConfig = true;

        subscribeToConfigUpdates(async (matchId, rawSettings) => {
            console.log(`[Publisher] Hot-reloading config signal received for: ${matchId}`, rawSettings);
            if (matchId === 'global') {
                for (const activeId of Array.from(this.timers.keys())) {
                    await this.restart(activeId);
                }
            } else {
                await this.restart(matchId);
            }
        }).catch((err) => {
            console.error('Failed to subscribe to config updates in publisher:', err);
        });
    }

    private async getEffectiveSettings(matchId: string) {
        const globalDoc = await GlobalSettings.findOne().lean();
        const g = globalDoc ?? { updateInterval: 3000, dataType: 'SCORE' as const, binary: true, compression: true, socketEnabled: true };

        const fixtureSettings = await MatchSettings.findOne({ matchId }).lean();
        if (!fixtureSettings || fixtureSettings.useGlobalDefaults) {
            return {
                updateInterval: g.updateInterval,
                dataType: g.dataType,
                binary: g.binary,
                compression: g.compression,
                socketEnabled: fixtureSettings ? fixtureSettings.socketEnabled && g.socketEnabled : g.socketEnabled,
                useGlobalDefaults: true,
            };
        }

        return {
            updateInterval: fixtureSettings.updateInterval ?? g.updateInterval,
            dataType: fixtureSettings.dataType ?? g.dataType,
            binary: fixtureSettings.binary ?? g.binary,
            compression: fixtureSettings.compression ?? g.compression,
            socketEnabled: fixtureSettings.socketEnabled,
            useGlobalDefaults: false,
        };
    }

    async restart(matchId: string): Promise<void> {
        this.stop(matchId);
        const settings = await this.getEffectiveSettings(matchId);
        if (settings.socketEnabled) {
            await this.startWithSettings(matchId, settings);
        }
    }

    async start(matchId: string): Promise<void> {
        if (this.timers.has(matchId)) {
            return;
        }

        const settings = await this.getEffectiveSettings(matchId);
        if (!settings.socketEnabled) {
            console.log(`Socket stream disabled for match ${matchId}`);
            return;
        }

        await this.startWithSettings(matchId, settings);
    }

    private async startWithSettings(matchId: string, settings: { updateInterval: number; dataType: 'SCORE' | 'FULL' | 'STATISTICS'; useGlobalDefaults?: boolean }): Promise<void> {
        const interval = settings.updateInterval;
        const dataType = settings.dataType;

        if (!this.scores.has(matchId)) {
            this.scores.set(matchId, { home: Math.floor(Math.random() * 5), away: Math.floor(Math.random() * 5) });
        }

        const publish = async () => {
            const data = this.generateMatchData(matchId, dataType);
            await publishMatchUpdate(matchId, data);
        };

        await publish();

        const timer = setInterval(publish, interval);
        this.timers.set(matchId, timer);
        console.log(`Realtime publisher running for ${matchId} (Interval: ${interval}ms, Type: ${dataType}, GlobalDefaults: ${settings.useGlobalDefaults ?? false})`);
    }

    stop(matchId: string): void {
        const timer = this.timers.get(matchId);
        if (timer) {
            clearInterval(timer);
            this.timers.delete(matchId);
            console.log(`Realtime publisher stopped for ${matchId}`);
        }
    }

    private generateMatchData(matchId: string, dataType: 'SCORE' | 'FULL' | 'STATISTICS'): MatchData {
        const score = this.scores.get(matchId) ?? { home: 0, away: 0 };
        if (Math.random() > 0.4) {
            score.home = (score.home + Math.floor(Math.random() * 2)) % 50;
        } else {
            score.away = (score.away + Math.floor(Math.random() * 2)) % 50;
        }

        const base: MatchData = {
            matchId,
            timestamp: Date.now(),
            score: { home: score.home, away: score.away },
            status: 'LIVE',
            dataType,
        };

        if (dataType === 'FULL') {
            base.meta = { possession: '55% / 45%', venue: 'National Stadium', weather: 'Clear 22°C' };
        } else if (dataType === 'STATISTICS') {
            base.meta = { shotsOnTarget: 8, fouls: 11, cornerKicks: 6, yellowCards: 2 };
        }

        return base;
    }
}