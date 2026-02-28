import type { Request, Response, NextFunction } from "express";
import { GradingService } from "../services/grading/grading.service";
import { ApiError } from "../utils/ApiError";

export interface GradeRequest {
  assignmentId: string;
  query: string;
}

export const gradeSubmission = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { assignmentId, query } = req.body as GradeRequest;

    // Validate request body
    if (!assignmentId || !query) {
      throw new ApiError(400, "Missing required fields", [
        { field: "assignmentId", message: "Assignment ID is required" },
        { field: "query", message: "Query is required" },
      ]);
    }

    // Get identityId from authenticated user (assuming it's set by auth middleware)
    const identityId = (req as any).user?.identityId;
    if (!identityId) {
      throw new ApiError(401, "Authentication required");
    }

    // Grade the submission
    const gradingResult = await GradingService.gradeSubmission(
      identityId,
      assignmentId,
      query,
    );

    // Always return success: true for grading operations
    // Grading failure is indicated by passed: false in the data
    res.json({
      success: true,
      data: gradingResult,
    });
  } catch (error) {
    // Pass execution errors to global error handler
    // These will return success: false
    next(error);
  }
};
