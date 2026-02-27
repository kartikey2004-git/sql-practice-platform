import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

declare global {
  namespace Express {
    interface Request {
      identityId: string;
    }
  }
}

export const identityMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    let identityId = req.headers["x-identity-id"] as string;

    if (!identityId) {
      identityId = `guest_${randomUUID()}`;
      res.setHeader("X-Identity-ID", identityId);
    }

    req.identityId = identityId;
    next();
  } catch (error) {
    console.error("Identity middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Identity generation failed",
      data: null,
      errors: [],
    });
  }
};
