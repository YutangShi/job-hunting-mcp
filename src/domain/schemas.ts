import { z } from "zod";

export const SearchQuerySchema = z.object({
  keyword: z.string().trim().max(100).default(""),
  area: z.array(z.string().trim().min(1).max(80)).max(10).default([]),
  jobcat: z.array(z.string().trim().min(1).max(100)).max(10).default([]),
  salary_min: z.number().int().positive().optional(),
  job_type: z.enum(["全職", "兼職", "高階", "派遣", "接案"]).optional(),
  remote: z.boolean().optional(),
  is_new: z.boolean().default(false),
  exp_years: z.number().int().min(0).max(99).optional(),
  edu: z.string().trim().max(20).optional(),
  sort: z.enum(["relevance", "date", "salary"]).optional(),
  page: z.number().int().min(1).max(100).default(1),
  page_size: z.number().int().min(10).max(20).default(10),
});

export const JobSummarySchema = z.object({
  source: z.enum(["104", "cake"]),
  job_ref: z.string().regex(/^(104|cake):[a-zA-Z0-9_-]+$/),
  job_name: z.string().max(300),
  company: z.string().max(200),
  salary: z.string().max(100),
  location: z.string().max(200),
  job_type: z.number().int().optional(),
  remote: z.number().int().optional(),
  snippet: z.string().max(800),
  url: z.string().url(),
  appear_date: z.string().max(20),
  fetched_at: z.string().datetime(),
});

export const JobDetailSchema = z.object({
  source: z.enum(["104", "cake"]),
  job_ref: z.string().regex(/^(104|cake):[a-zA-Z0-9_-]+$/),
  job_name: z.string().max(300),
  company: z.string().max(200),
  description: z.string().max(12000),
  requirements: z.string().max(4000),
  salary: z.string().max(200),
  location: z.string().max(300),
  url: z.string().url(),
  fetched_at: z.string().datetime(),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type JobSummary = z.infer<typeof JobSummarySchema>;
export type JobDetail = z.infer<typeof JobDetailSchema>;

export type SearchResponse = {
  source: string;
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
  salary_filter_note?: string;
  jobs: JobSummary[];
};
