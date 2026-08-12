import mongoose, { Schema, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        password: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            enum: ["ADMIN", "USER"],
            default: "USER",
        },
    },
    {
        timestamps: true,
    },
);

export type UserDocument = InferSchemaType<typeof userSchema>;

export const UserModel = mongoose.model("User", userSchema);
