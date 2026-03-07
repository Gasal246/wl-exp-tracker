import { Schema, model, models, type InferSchemaType } from "mongoose";

const superAdminSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    currency: { type: String, required: true, default: "AED", uppercase: true },
    avatarUrl: { type: String, default: null },
  },
  { timestamps: true },
);

export type SuperAdminDocument = InferSchemaType<typeof superAdminSchema> & {
  _id: string;
};

export const SuperAdmin = models.SuperAdmin || model("SuperAdmin", superAdminSchema, "superadmins");
