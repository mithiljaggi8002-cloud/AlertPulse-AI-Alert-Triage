import type { Request, Response } from "express";
import { registerUserSchema } from "../validators/user.schema.js";

export function registerUser(req: Request, res: Response) {
  const result = registerUserSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: result.error.issues,
    });
    return;
  }

  // TODO: wire up service/repository logic
  res.status(501).json({
    success: false,
    message: "Registration is not implemented yet",
  });
}
