import type { Request, Response } from "express";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { ExecutionService } from "../services/sandbox/execution.service";

interface ExecuteQueryBody {
  assignmentId: string;
  query: string;
}

export class ExecutionController {
  executeQuery = asyncHandler(async (req: Request, res: Response) => {
    const { assignmentId, query } = req.body as ExecuteQueryBody;

    // Validate request body
    if (!assignmentId || typeof assignmentId !== "string") {
      throw new ApiError(400, "Invalid or missing assignmentId");
    }

    if (!query || typeof query !== "string") {
      throw new ApiError(400, "Invalid or missing query");
    }

    // Get identityId from middleware
    const identityId = req.identityId;
    if (!identityId) {
      throw new ApiError(401, "Identity not found in request");
    }

    try {
      const result = await ExecutionService.executeQuery(
        identityId,
        assignmentId,
        query
      );

      const response = new ApiResponse(
        200,
        result,
        "Query executed successfully"
      );
      res.status(response.statusCode).json(response);
    } catch (error: any) {
      // Parse error from execution service
      const errorMessage = error.message || "Unknown execution error";
      
      // Extract error type and message
      const [errorType, ...messageParts] = errorMessage.split(": ");
      const message = messageParts.join(": ") || errorMessage;

      // Map error types to appropriate HTTP status codes
      let statusCode = 500;
      if (errorType === "VALIDATION_ERROR") {
        statusCode = 400;
      } else if (errorType === "SANDBOX_NOT_FOUND") {
        statusCode = 404;
      } else if (errorType === "TIMEOUT") {
        statusCode = 408;
      } else if (errorType === "PERMISSION_ERROR") {
        statusCode = 403;
      } else if (errorType === "SYNTAX_ERROR" || errorType === "RUNTIME_ERROR") {
        statusCode = 400;
      }

      throw new ApiError(statusCode, message);
    }
  });
}

export const executionController = new ExecutionController();
