import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";

const notificationSchema = new Schema(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    recipientRole: { type: String, enum: ["ADMIN", "EMPLOYEE"], required: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    actorRole: { type: String, enum: ["ADMIN", "EMPLOYEE"], required: true },
    actorName: { type: String, required: true, trim: true },
    actorEmail: { type: String, required: true, trim: true, lowercase: true },
    actorAvatarUrl: { type: String, default: null },
    eventType: { type: String, enum: ["TRANSACTION_ADDED", "BILL_ADDED"], required: true },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    transactionType: { type: String, enum: ["credit", "debit"], required: true },
    amountAdmin: { type: Number, required: true, min: 0 },
    amountEmployee: { type: Number, required: true, min: 0 },
    adminCurrency: { type: String, required: true, uppercase: true },
    employeeCurrency: { type: String, required: true, uppercase: true },
    refType: { type: String, enum: ["TRANSACTION"], required: true, default: "TRANSACTION" },
    refId: { type: Schema.Types.ObjectId, required: true, index: true },
    isSeen: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

notificationSchema.index({ recipientId: 1, isSeen: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });

export type NotificationDocument = InferSchemaType<typeof notificationSchema> & {
  _id: Types.ObjectId;
};

export const Notification =
  models.Notification || model("Notification", notificationSchema, "notifications");
