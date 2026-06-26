import { Request, Response, NextFunction } from "express";

export const logger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const requestId = req.headers["x-request-id"];

  console.log(
    `[${new Date().toISOString()}] [${requestId}] → ${req.method} ${req.url}`,
  );

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] [${requestId}] ← ${res.statusCode} ${duration}ms`,
    );
  });

  next();
};
