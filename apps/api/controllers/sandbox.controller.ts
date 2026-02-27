import type { Request, Response } from "express";
import { SandboxService } from "../services/sandbox/sandbox.service";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";

export class SandboxController {
  static initSandbox = asyncHandler(async (req: Request, res: Response) => {
    const { assignmentId } = req.body;

    if (!assignmentId) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "assignmentId is required"));
    }

    try {
      const result = await SandboxService.initSandbox(
        req.identityId,
        assignmentId,
      );

      return res.status(200).json(
        new ApiResponse(
          200,
          {
            schemaName: result.schemaName,
            isNew: result.isNew,
          },
          "Sandbox initialized successfully",
        ),
      );
    } catch (error) {
      console.error("Sandbox initialization error:", error);

      if (error instanceof Error && error.message === "Assignment not found") {
        return res
          .status(404)
          .json(new ApiResponse(404, null, "Assignment not found"));
      }

      return res
        .status(500)
        .json(new ApiResponse(500, null, "Failed to initialize sandbox"));
    }
  });
}
