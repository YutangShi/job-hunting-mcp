import { z } from "zod";
import { JobSummarySchema } from "./schemas.js";

export const SalaryComparisonSchema = z.object({
  raw: z.string().max(200),
  min: z.number().nonnegative().optional(),
  max: z.number().nonnegative().optional(),
  period: z.enum(["hourly", "daily", "monthly", "yearly"]).optional(),
  comparability: z.enum(["comparable", "unknown"]),
});

export const JobComparisonItemSchema = z.object({
  source: z.enum(["104", "cake"]),
  job_ref: z.string().regex(/^(104|cake):[A-Za-z0-9_-]{3,120}$/),
  job_name: z.string().max(300),
  company: z.string().max(200),
  description: z.string().max(12000),
  requirements: z.string().max(4000),
  salary: SalaryComparisonSchema,
  location: z.string().max(300),
  url: z.string().url(),
  fetched_at: z.string().datetime(),
  evidence: z.literal("explicit"),
});

export const JobComparisonResultSchema = z.object({
  status: z.enum(["complete", "partial"]),
  items: z.array(JobComparisonItemSchema).max(10),
  failures: z.array(z.object({ job_ref: z.string().max(140), code: z.string().max(80), message: z.string().max(500) })).max(10),
});

export const CompanyDetailSchema = z.object({
  source: z.enum(["104", "cake"]),
  company_ref: z.string().regex(/^(104|cake)-company:[a-zA-Z0-9_-]+$/),
  company_name: z.string().max(200),
  company_url: z.string().url(),
  industry: z.string().max(200),
  size: z.string().max(100),
  location: z.string().max(300),
  description: z.string().max(5000),
  benefits: z.array(z.string().max(500)).max(100),
  open_jobs: z.array(JobSummarySchema).max(50),
  fetched_at: z.string().datetime(),
});

export type SalaryComparison = z.infer<typeof SalaryComparisonSchema>;
export type JobComparisonItem = z.infer<typeof JobComparisonItemSchema>;
export type JobComparisonResult = z.infer<typeof JobComparisonResultSchema>;
export type CompanyDetail = z.infer<typeof CompanyDetailSchema>;
