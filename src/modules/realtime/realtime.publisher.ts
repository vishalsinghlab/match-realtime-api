import { MatchSettings } from '../matches/match-settings.model.js';
import { GlobalSettings } from '../admin/global-settings.model.js';
import { publishMatchUpdate, subscribeToConfigUpdates } from './redis.service.js';
import { MatchModel } from '../matches/match.model.js';

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
            // console.log(`[Publisher] Hot-reloading config signal received for: ${matchId}`, rawSettings);
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
        try {
            const match = await MatchModel.findById(matchId).lean();
            if (!match || match.status !== 'LIVE') {
                return;
            }
        } catch (err) {
            console.error(`Failed to check match status for ${matchId}:`, err);
            return;
        }

        const settings = await this.getEffectiveSettings(matchId);
        if (settings.socketEnabled) {
            await this.startWithSettings(matchId, settings);
        }
    }

    async start(matchId: string): Promise<void> {
        if (this.timers.has(matchId)) {
            return;
        }

        try {
            const match = await MatchModel.findById(matchId).lean();
            if (!match || match.status !== 'LIVE') {
                return;
            }
        } catch (err) {
            console.error(`Failed to check match status for ${matchId}:`, err);
            return;
        }

        const settings = await this.getEffectiveSettings(matchId);
        if (!settings.socketEnabled) {
            // console.log(`Socket stream disabled for match ${matchId}`);
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
            let sport = 'football';
            try {
                const matchDoc = await MatchModel.findById(matchId).lean();
                if (matchDoc) sport = matchDoc.sport.toLowerCase();
            } catch (e) {
                // fallback to football
            }
            const data = this.generateMatchData(matchId, dataType, sport);
            await publishMatchUpdate(matchId, data);
        };

        await publish();

        const timer = setInterval(publish, interval);
        this.timers.set(matchId, timer);
    }

    stop(matchId: string): void {
        const timer = this.timers.get(matchId);
        if (timer) {
            clearInterval(timer);
            this.timers.delete(matchId);
        }
    }

    private generateMatchData(matchId: string, dataType: 'SCORE' | 'FULL' | 'STATISTICS', sport: string = 'football'): MatchData {
        const score = this.scores.get(matchId) ?? { home: 0, away: 0 };

        if (sport.includes('cricket')) {
            if (Math.random() > 0.3) score.home = score.home + Math.floor(Math.random() * 6);
            if (Math.random() > 0.6) score.away = score.away + Math.floor(Math.random() * 4);
        } else if (sport.includes('basket')) {
            score.home += Math.floor(Math.random() * 3);
            score.away += Math.floor(Math.random() * 3);
        } else {
            if (Math.random() > 0.6) score.home += 1;
            if (Math.random() > 0.7) score.away += 1;
        }

        const base: MatchData = {
            matchId,
            timestamp: Date.now(),
            score: { home: score.home, away: score.away },
            status: 'LIVE',
            dataType,
        };

        if (sport.includes('cricket')) {
            const overs = Math.min(20, Math.floor(score.home / 10) + ((score.home % 6) / 10));
            const wickets = Math.min(10, Math.floor(score.home / 35));
            base.meta = {
                sport: 'Cricket',
                runs: score.home,
                wickets,
                overs: overs.toFixed(1),
                crr: (score.home / Math.max(1, overs || 1)).toFixed(2),
                rrr: (8.4).toFixed(2),
                recentBalls: ['4', '1', 'W', '6', '0', '2', '1'].slice(0, 6),
                striker: { name: 'V. Kohli', runs: 42 + (score.home % 15), balls: 28, fours: 4, sixes: 2 },
                nonStriker: { name: 'K.L. Rahul', runs: 28, balls: 19, fours: 3, sixes: 1 },
                bowler: { name: 'J. Bumrah', overs: '3.4', maidens: 0, runs: 26, wickets: 2 }
            };
        } else if (sport.includes('basket')) {
            base.meta = {
                sport: 'Basketball',
                quarter: 'Q3',
                gameClock: '04:22',
                shotClock: 12,
                q1: { home: 24, away: 22 },
                q2: { home: 28, away: 26 },
                q3: { home: score.home - 52, away: score.away - 48 },
                fgPct: { home: '48%', away: '44%' },
                threePtPct: { home: '38%', away: '32%' },
                rebounds: { home: 34, away: 31 },
                assists: { home: 22, away: 19 }
            };
        } else if (sport.includes('tennis')) {
            const points = ['0', '15', '30', '40', 'AD'];
            base.meta = {
                sport: 'Tennis',
                setScores: [{ home: 6, away: 4 }, { home: 3, away: 6 }, { home: 4, away: 3 }],
                gameScore: { home: points[score.home % 5], away: points[score.away % 4] },
                server: score.home % 2 === 0 ? 'home' : 'away',
                aces: { home: 9, away: 6 },
                doubleFaults: { home: 2, away: 4 },
                breakPointsWon: { home: '3/5', away: '2/4' }
            };
        } else if (sport.includes('esport') || sport.includes('gaming')) {
            base.meta = {
                sport: 'Esports',
                mapScore: { home: 1, away: 1 },
                roundScore: { home: score.home % 16, away: score.away % 16 },
                currentMap: 'De_Inferno',
                phase: 'LIVE ROUND',
                bombStatus: 'PLANTED',
                economy: { home: '$14,200 (Full Buy)', away: '$4,100 (Eco)' },
                topFragger: { name: 's1mple', kills: 24, deaths: 11, assists: 5, adr: 104.2 }
            };
        } else {
            const minute = Math.min(90, 15 + Math.floor((Date.now() % 3600000) / 45000));
            base.meta = {
                sport: 'Football',
                minute: `${minute}'`,
                possession: { home: 56, away: 44 },
                shots: { home: 12, away: 8 },
                shotsOnTarget: { home: 5, away: 3 },
                fouls: { home: 9, away: 11 },
                yellowCards: { home: 2, away: 1 },
                redCards: { home: 0, away: 0 },
                corners: { home: 6, away: 3 }
            };
        }

        return base;
    }
}

export const realtimePublisher = new RealtimePublisher();
