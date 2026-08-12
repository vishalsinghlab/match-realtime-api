import mongoose, { Schema } from 'mongoose';

export interface GlobalSettingsDocument extends mongoose.Document {
    updateInterval: number;
    dataType: 'SCORE' | 'FULL' | 'STATISTICS';
    binary: boolean;
    compression: boolean;
    socketEnabled: boolean;
}

const globalSettingsSchema = new Schema<GlobalSettingsDocument>(
    {
        updateInterval: {
            type: Number,
            default: 3000,
            min: 250,
        },
        dataType: {
            type: String,
            enum: ['SCORE', 'FULL', 'STATISTICS'],
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

export const GlobalSettings = mongoose.model<GlobalSettingsDocument>(
    'GlobalSettings',
    globalSettingsSchema,
);
