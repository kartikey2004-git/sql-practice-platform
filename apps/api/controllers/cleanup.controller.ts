import type { Request, Response } from "express";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { CleanupService } from "../services/cleanup/cleanup.service";

export class CleanupController {
  performCleanup = asyncHandler(async (req: Request, res: Response) => {
    const { daysToKeep = 7 } = req.body;
    const identityId = req.identityId;

    // Only allow system administrators or internal calls
    // For now, we'll check for a special header (in production, use proper auth)
    const isAuthorized = req.headers["x-cleanup-authorization"] === process.env.CLEANUP_TOKEN;
    
    if (!isAuthorized) {
      throw new ApiError(403, "Unauthorized: Cleanup requires special authorization");
    }

    const days = Math.max(1, Math.min(30, parseInt(daysToKeep) || 7)); // Between 1-30 days

    const result = await CleanupService.performFullCleanup(days);

    const response = new ApiResponse(
      200,
      result,
      "Cleanup completed successfully",
    );
    res.status(response.statusCode).json(response);
  });

  getCleanupStats = asyncHandler(async (req: Request, res: Response) => {
    const isAuthorized = req.headers["x-cleanup-authorization"] === process.env.CLEANUP_TOKEN;
    
    if (!isAuthorized) {
      throw new ApiError(403, "Unauthorized: Stats access requires special authorization");
    }

    const stats = await CleanupService.getCleanupStats();

    const response = new ApiResponse(
      200,
      stats,
      "Cleanup stats retrieved successfully",
    );
    res.status(response.statusCode).json(response);
  });
}

export const cleanupController = new CleanupController();
