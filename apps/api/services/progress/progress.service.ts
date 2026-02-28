import { UserProgress } from "../../models/userProgress.model";
import mongoose from "mongoose";

export interface ProgressUpdate {
  lastQuery?: string;
  incrementAttempt?: boolean;
  markCompleted?: boolean;
}

export interface ProgressData {
  lastQuery: string;
  attemptCount: number;
  isCompleted: boolean;
  completedAt?: Date;
  lastAttemptAt: Date;
}

export class ProgressService {
  /**
   * Get or create user progress for a specific assignment
   */
  static async getOrCreateProgress(
    identityId: string,
    assignmentId: string,
  ): Promise<ProgressData> {
    try {
      let progress = await UserProgress.findOne({
        identityId,
        assignmentId: new mongoose.Types.ObjectId(assignmentId),
      });

      if (!progress) {
        progress = await UserProgress.create({
          identityId,
          assignmentId: new mongoose.Types.ObjectId(assignmentId),
          lastQuery: "",
          attemptCount: 0,
          isCompleted: false,
          lastAttemptAt: new Date(),
        });
      }

      return {
        lastQuery: progress.lastQuery,
        attemptCount: progress.attemptCount,
        isCompleted: progress.isCompleted,
        completedAt: progress.completedAt,
        lastAttemptAt: progress.lastAttemptAt,
      };
    } catch (error) {
      console.error("Error getting/creating progress:", error);
      throw error;
    }
  }

  /**
   * Update user progress
   */
  static async updateProgress(
    identityId: string,
    assignmentId: string,
    updates: ProgressUpdate,
  ): Promise<ProgressData> {
    try {
      const updateData: any = {
        lastAttemptAt: new Date(),
      };

      if (updates.lastQuery !== undefined) {
        updateData.lastQuery = updates.lastQuery;
      }

      if (updates.incrementAttempt) {
        updateData.$inc = { attemptCount: 1 };
      }

      if (updates.markCompleted && !updates.lastQuery?.includes("completed")) {
        updateData.isCompleted = true;
        updateData.completedAt = new Date();
      }

      const progress = await UserProgress.findOneAndUpdate(
        {
          identityId,
          assignmentId: new mongoose.Types.ObjectId(assignmentId),
        },
        updateData,
        {
          new: true,
          upsert: true,
        },
      );

      if (!progress) {
        throw new Error("Failed to update progress");
      }

      return {
        lastQuery: progress.lastQuery,
        attemptCount: progress.attemptCount,
        isCompleted: progress.isCompleted,
        completedAt: progress.completedAt,
        lastAttemptAt: progress.lastAttemptAt,
      };
    } catch (error) {
      console.error("Error updating progress:", error);
      throw error;
    }
  }

  /**
   * Get all progress for an identity
   */
  static async getAllProgress(identityId: string): Promise<
    Array<{
      assignmentId: string;
      progress: ProgressData;
    }>
  > {
    try {
      const progressRecords = await UserProgress.find({
        identityId,
      }).populate("assignmentId", "title difficulty");

      return progressRecords.map((record) => ({
        assignmentId: record.assignmentId._id.toString(),
        progress: {
          lastQuery: record.lastQuery,
          attemptCount: record.attemptCount,
          isCompleted: record.isCompleted,
          completedAt: record.completedAt,
          lastAttemptAt: record.lastAttemptAt,
        },
      }));
    } catch (error) {
      console.error("Error getting all progress:", error);
      throw error;
    }
  }

  /**
   * Delete progress for a specific assignment
   */
  static async deleteProgress(
    identityId: string,
    assignmentId: string,
  ): Promise<void> {
    try {
      await UserProgress.deleteOne({
        identityId,
        assignmentId: new mongoose.Types.ObjectId(assignmentId),
      });
    } catch (error) {
      console.error("Error deleting progress:", error);
      throw error;
    }
  }
}
