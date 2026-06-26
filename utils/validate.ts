import { z } from "zod";

export const createQuoteSchema = z.object({
  customer: z.string().min(1),
  project: z.string().min(1),
  status: z.string().min(1),
  estimatedValue: z.number().positive(),
});
export const ALLOWED_STATUSES = [
  "New",
  "In Review",
  "Needs Info",
  "Completed",
] as const;
