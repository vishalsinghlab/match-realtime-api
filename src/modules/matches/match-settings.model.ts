import mongoose, { Schema } from 'mongoose';

export interface MatchSettingsDocument
    extends mongoose.Document {
    matchId: string;

    updateInterval: number;

    dataType:
    | 'SCORE'
    | 'FULL'
    | 'STATISTICS';

    binary: boolean;

    compression: boolean;

    socketEnabled: boolean;
}

const matchSettingsSchema =
    new Schema<MatchSettingsDocument>(
        {
            matchId: {
                type: String,
                required: true,
                unique: true,
            },

            updateInterval: {
                type: Number,
                required: true,
                default: 3000,
                min: 250,
            },

            dataType: {
                type: String,
                enum: [
                    'SCORE',
                    'FULL',
                    'STATISTICS',
                ],
                default: 'SCORE',
            },

            binary: {
                type: Boolean,
                default: true,
            },

            compression: {
                type: Boolean,
                default: true,
            },

            socketEnabled: {
                type: Boolean,
                default: true,
            },
        },
        {
            timestamps: true,
        },
    );

export const MatchSettings =
    mongoose.model<MatchSettingsDocument>(
        'MatchSettings',
        matchSettingsSchema,
    );