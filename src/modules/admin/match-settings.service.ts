import { MatchSettings } from '../matches/match-settings.model.js';

interface UpdateMatchSettingsInput {
    updateInterval?: number;
    dataType?: 'SCORE' | 'FULL' | 'STATISTICS';
    binary?: boolean;
    compression?: boolean;
    socketEnabled?: boolean;
}

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
    return MatchSettings.findOneAndUpdate(
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
};