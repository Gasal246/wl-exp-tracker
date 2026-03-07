import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    isAdmin: { type: Boolean, required: true, default: false },
    adminId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    currency: { type: String, required: true, uppercase: true },
    avatarUrl: { type: String, default: null },
    avatarStoragePath: { type: String, default: null },
    fcmTokens: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

userSchema.index({ adminId: 1, createdAt: -1 });

export type UserDocument = InferSchemaType<typeof userSchema> & {
  _id: Types.ObjectId;
};

export const User = models.User || model("User", userSchema, "users");
