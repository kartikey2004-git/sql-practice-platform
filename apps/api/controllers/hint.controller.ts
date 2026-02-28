import type { Request, Response } from "express";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { HintService } from "../services/hints/hint.service";

export class HintController {
  getHint = asyncHandler(async (req: Request, res: Response) => {
    const { assignmentId, userQuery, hintType } = req.body;
    const identityId = req.identityId;

    // Validate request body
    if (!assignmentId || typeof assignmentId !== "string") {
      throw new ApiError(400, "Invalid or missing assignmentId");
    }

    if (!userQuery || typeof userQuery !== "string") {
      throw new ApiError(400, "Invalid or missing userQuery");
    }

    if (hintType && !["syntax", "logic", "approach"].includes(hintType)) {
      throw new ApiError(400, "Invalid hintType. Must be: syntax, logic, or approach");
    }

    const hintRequest = {
      assignmentId,
      userQuery,
      hintType: hintType as "syntax" | "logic" | "approach" || undefined,
    };

    const hintResponse = await HintService.getHint(identityId, hintRequest);

    const response = new ApiResponse(
      200,
      hintResponse,
      "Hint generated successfully",
    );
    res.status(response.statusCode).json(response);
  });

  getHintHistory = asyncHandler(async (req: Request, res: Response) => {
    const { assignmentId } = req.query;
    const identityId = req.identityId;

    const hintHistory = await HintService.getHintHistory(
      identityId,
      assignmentId as string,
    );

    const response = new ApiResponse(
      200,
      hintHistory,
      "Hint history fetched successfully",
    );
    res.status(response.statusCode).json(response);
  });
}

export const hintController = new HintController();
