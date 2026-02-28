import type { Request, Response } from "express";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { ProgressService } from "../services/progress/progress.service";

export class ProgressController {
  getProgress = asyncHandler(async (req: Request, res: Response) => {
    const { assignmentId } = req.params;
    const identityId = req.identityId;

    if (!assignmentId || typeof assignmentId !== "string") {
      throw new ApiError(400, "Invalid assignment id");
    }

    const progress = await ProgressService.getOrCreateProgress(identityId, assignmentId);

    const response = new ApiResponse(
      200,
      progress,
      "Progress fetched successfully",
    );
    res.status(response.statusCode).json(response);
  });

  updateProgress = asyncHandler(async (req: Request, res: Response) => {
    const { assignmentId } = req.params;
    const { lastQuery, incrementAttempt, markCompleted } = req.body;
    const identityId = req.identityId;

    if (!assignmentId || typeof assignmentId !== "string") {
      throw new ApiError(400, "Invalid assignment id");
    }

    const updates = {
      lastQuery,
      incrementAttempt: Boolean(incrementAttempt),
      markCompleted: Boolean(markCompleted),
    };

    const progress = await ProgressService.updateProgress(identityId, assignmentId, updates);

    const response = new ApiResponse(
      200,
      progress,
      "Progress updated successfully",
    );
    res.status(response.statusCode).json(response);
  });

  getAllProgress = asyncHandler(async (req: Request, res: Response) => {
    const identityId = req.identityId;

    const allProgress = await ProgressService.getAllProgress(identityId);

    const response = new ApiResponse(
      200,
      allProgress,
      "All progress fetched successfully",
    );
    res.status(response.statusCode).json(response);
  });
}

export const progressController = new ProgressController();
