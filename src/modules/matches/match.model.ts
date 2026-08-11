import mongoose, { Schema, type InferSchemaType } from "mongoose";

const matchSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        sport: {
            type: String,
            required: true,
            trim: true,
        },

        status: {
            type: String,
            enum: ["UPCOMING", "LIVE", "COMPLETED"],
            default: "UPCOMING",
        },

        startTime: {
            type: Date,
            required: true,
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

export type Match = InferSchemaType<typeof matchSchema>;

export const MatchModel = mongoose.model("Match", matchSchema);