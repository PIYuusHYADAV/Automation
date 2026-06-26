import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

export const requestId = (req: Request, res: Response, next: NextFunction) => {
  req.headers["x-request-id"] = randomUUID();
  res.setHeader("x-request-id", req.headers["x-request-id"]);
  next();
};
