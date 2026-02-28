import mongoose, { Schema, Document } from "mongoose";

export interface IHintLog extends Document {
  identityId: string;
  assignmentId: mongoose.Types.ObjectId;
  userQuery: string;
  hint: string;
  hintType: "syntax" | "logic" | "approach";
  requestId: string;
  createdAt: Date;
}

const HintLogSchema = new Schema<IHintLog>(
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
    userQuery: {
      type: String,
      required: true,
    },
    hint: {
      type: String,
      required: true,
    },
    hintType: {
      type: String,
      enum: ["syntax", "logic", "approach"],
      required: true,
    },
    requestId: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  },
);

HintLogSchema.index({ identityId: 1, assignmentId: 1 });
HintLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // 30 days TTL

export const HintLog = mongoose.model<IHintLog>("HintLog", HintLogSchema);
