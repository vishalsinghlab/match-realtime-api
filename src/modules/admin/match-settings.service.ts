import { MatchSettings } from '../matches/match-settings.model.js';
import { GlobalSettings } from './global-settings.model.js';
import { publishConfigUpdated } from '../realtime/redis.service.js';

interface UpdateMatchSettingsInput {
    useGlobalDefaults?: boolean;
    updateInterval?: number;
    dataType?: 'SCORE' | 'FULL' | 'STATISTICS';
    binary?: boolean;
    compression?: boolean;
    socketEnabled?: boolean;
}

export const getGlobalSettings = async () => {
    let global = await GlobalSettings.findOne().lean();
    if (!global) {
        global = (await GlobalSettings.create({
            updateInterval: 3000,
            dataType: 'SCORE',
            binary: true,
            compression: true,
            socketEnabled: true,
        })).toObject();
    }
    return global;
};

export const updateGlobalSettings = async (input: UpdateMatchSettingsInput) => {
    const updated = await GlobalSettings.findOneAndUpdate(
        {},
        { $set: input },
        { new: true, upsert: true, runValidators: true }
    ).lean();

    if (updated) {
        await publishConfigUpdated('global', updated);
    }
    return updated;
};

export const getMatchSettings = async (
    matchId: string,
) => {
    return MatchSettings.findOne({
        matchId,
    }).lean();
};

export const updateMatchSettings = async (
    matchId: string,
    input: UpdateMatchSettingsInput,
) => {
    const updated = await MatchSettings.findOneAndUpdate(
        { matchId },
        {
            $set: input,
            $setOnInsert: {
                matchId,
            },
        },
        {
            new: true,
            upsert: true,
            runValidators: true,
        },
    ).lean();

    if (updated) {
        await publishConfigUpdated(matchId, updated);
    }

    return updated;
};