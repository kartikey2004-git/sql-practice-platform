import { ExecutionLog } from "../../models/executionLog.model";
import mongoose from "mongoose";

export interface LogExecutionData {
  identityId: string;
  assignmentId: string;
  query: string;
  executionTime: number;
  rowCount: number;
  status: "success" | "error";
  errorMessage?: string;
  schemaName: string;
}

export class ExecutionLogService {
  /**
   * Log query execution for analytics and debugging
   */
  static async logExecution(data: LogExecutionData): Promise<void> {
    try {
      await ExecutionLog.create({
        identityId: data.identityId,
        assignmentId: new mongoose.Types.ObjectId(data.assignmentId),
        query: data.query,
        executionTime: data.executionTime,
        rowCount: data.rowCount,
        status: data.status,
        errorMessage: data.errorMessage,
        schemaName: data.schemaName,
      });
    } catch (error) {
      console.error("Error logging execution:", error);
      // Don't throw error to avoid affecting main execution flow
    }
  }

  /**
   * Get execution statistics for an identity
   */
  static async getExecutionStats(
    identityId: string,
    assignmentId?: string,
  ): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    totalRowsProcessed: number;
  }> {
    try {
      const matchStage: any = { identityId };
      if (assignmentId) {
        matchStage.assignmentId = new mongoose.Types.ObjectId(assignmentId);
      }

      const stats = await ExecutionLog.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalExecutions: { $sum: 1 },
            successfulExecutions: {
              $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] },
            },
            failedExecutions: {
              $sum: { $cond: [{ $eq: ["$status", "error"] }, 1, 0] },
            },
            averageExecutionTime: { $avg: "$executionTime" },
            totalRowsProcessed: { $sum: "$rowCount" },
          },
        },
      ]);

      const result = stats[0] || {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        totalRowsProcessed: 0,
      };

      return result;
    } catch (error) {
      console.error("Error getting execution stats:", error);
      throw error;
    }
  }

  /**
   * Get recent execution logs for debugging
   */
  static async getRecentExecutions(
    identityId: string,
    assignmentId?: string,
    limit: number = 50,
  ): Promise<Array<{
    query: string;
    executionTime: number;
    rowCount: number;
    status: string;
    errorMessage?: string;
    createdAt: Date;
  }>> {
    try {
      const filter: any = { identityId };
      if (assignmentId) {
        filter.assignmentId = new mongoose.Types.ObjectId(assignmentId);
      }

      const executions = await ExecutionLog.find(filter)
        .select("query executionTime rowCount status errorMessage createdAt")
        .sort({ createdAt: -1 })
        .limit(limit);

      return executions.map((execution) => ({
        query: execution.query,
        executionTime: execution.executionTime,
        rowCount: execution.rowCount,
        status: execution.status,
        errorMessage: execution.errorMessage,
        createdAt: execution.createdAt,
      }));
    } catch (error) {
      console.error("Error getting recent executions:", error);
      throw error;
    }
  }

  /**
   * Clean up old execution logs (for cron job)
   */
  static async cleanupOldLogs(daysToKeep: number = 7): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      const result = await ExecutionLog.deleteMany({
        createdAt: { $lt: cutoffDate },
      });

      console.log(`Cleaned up ${result.deletedCount} old execution logs`);
      return result.deletedCount;
    } catch (error) {
      console.error("Error cleaning up old logs:", error);
      throw error;
    }
  }
}
