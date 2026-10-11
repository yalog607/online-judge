import { z } from "zod";

export const reportQuerySchema = z.object({
  type: z.enum(["class", "contest"]).default("class"),
  id: z.coerce.number().int().positive().optional(),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;
