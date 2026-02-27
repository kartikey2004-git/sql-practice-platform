import mongoose, { Schema, Document } from "mongoose";

export interface ISandboxMeta extends Document {
  identityId: string;
  assignmentId: mongoose.Types.ObjectId;
  schemaName: string;
  createdAt: Date;
  lastUsedAt: Date;
}

const SandboxMetaSchema = new Schema<ISandboxMeta>(
  {
    identityId: {
      type: String,
      required: true,
      index: true,
    },
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
      index: true,
    },
    schemaName: {
      type: String,
      required: true,
      unique: true,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

SandboxMetaSchema.index({ identityId: 1, assignmentId: 1 }, { unique: true });

export const SandboxMeta = mongoose.model<ISandboxMeta>(
  "SandboxMeta",
  SandboxMetaSchema,
);
