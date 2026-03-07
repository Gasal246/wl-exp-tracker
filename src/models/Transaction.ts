import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";

const transactionSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    createdById: { type: Schema.Types.ObjectId, ref: "User", default: null },
    createdByRole: { type: String, enum: ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"], required: true },
    type: { type: String, enum: ["credit", "debit"], required: true },
    creditSource: {
      type: String,
      enum: ["PETTY_CASH", "CASH_IN_HAND"],
      default: null,
    },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    amountEmployee: { type: Number, required: true, min: 0 },
    amountAdmin: { type: Number, required: true, min: 0 },
    employeeCurrency: { type: String, required: true, uppercase: true },
    adminCurrency: { type: String, required: true, uppercase: true },
    exchangeRate: { type: Number, required: true, min: 0 },
    billImageUrl: { type: String, default: null },
    billStoragePath: { type: String, default: null },
    transactionAt: { type: Date, required: true, index: true },
  },
  { timestamps: true },
);

transactionSchema.index({ employeeId: 1, transactionAt: -1, _id: -1 });
transactionSchema.index({ adminId: 1, transactionAt: -1 });

export type TransactionDocument = InferSchemaType<typeof transactionSchema> & {
  _id: Types.ObjectId;
};

export const Transaction =
  models.Transaction || model("Transaction", transactionSchema, "transactions");
