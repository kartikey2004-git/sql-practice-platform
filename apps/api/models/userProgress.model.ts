import mongoose, { Schema, Document } from "mongoose";

export interface IUserProgress extends Document {
  identityId: string;
  assignmentId: mongoose.Types.ObjectId;
  lastQuery: string;
  attemptCount: number;
  isCompleted: boolean;
  completedAt?: Date;
  lastAttemptAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserProgressSchema = new Schema<IUserProgress>(
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
    lastQuery: {
      type: String,
      default: "",
    },
    attemptCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
    lastAttemptAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

UserProgressSchema.index({ identityId: 1, assignmentId: 1 }, { unique: true });

export const UserProgress = mongoose.model<IUserProgress>(
  "UserProgress",
  UserProgressSchema,
);
