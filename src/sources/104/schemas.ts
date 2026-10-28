import { z } from "zod";

const NumberLike = z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)]);

export const RawSearchJobSchema = z.object({
  jobNo: NumberLike,
  jobName: z.string().min(1).max(1_000),
  custName: z.string().max(500).default(""),
  salaryLow: z.number().finite().optional().default(0),
  salaryHigh: z.number().finite().optional().default(0),
  s10: z.number().int().optional().default(0),
  jobAddrNoDesc: z.string().max(500).optional().default(""),
  jobAddress: z.string().max(1_000).optional().default(""),
  jobType: z.number().int().optional(),
  remoteWorkType: z.number().int().optional(),
  descSnippet: z.string().max(100_000).optional().default(""),
  description: z.string().max(500_000).optional().default(""),
  appearDate: z.string().max(30).optional().default(""),
  link: z.object({ job: z.string().min(1).max(2_000), cust: z.string().max(2_000).optional() }).passthrough(),
}).passthrough();

export const RawSearchResponseSchema = z.object({
  data: z.array(RawSearchJobSchema).max(100),
  metadata: z.object({
    pagination: z.object({
      currentPage: z.number().int().positive(),
      lastPage: z.number().int().positive(),
      total: z.number().int().nonnegative(),
    }).passthrough(),
  }).passthrough(),
}).passthrough();

const TextSchema = z.string().max(100_000).optional().default("");
const TextListSchema = z.array(z.union([
  z.string().max(2_000),
  z.object({ description: z.string().max(2_000).optional().default("") }).passthrough(),
])).max(500).optional().default([]);

export const RawDetailResponseSchema = z.object({
  data: z.object({
    header: z.object({
      jobName: z.string().min(1).max(1_000),
      custName: z.string().max(500).optional().default(""),
      appearDate: z.string().max(30).optional().default(""),
    }).passthrough(),
    jobDetail: z.object({
      jobDescription: TextSchema,
      salary: z.string().max(500).optional().default(""),
      addressRegion: z.string().max(500).optional().default(""),
      addressArea: z.string().max(500).optional().default(""),
      addressDetail: z.string().max(1_000).optional().default(""),
    }).passthrough(),
    condition: z.object({
      workExp: z.string().max(1_000).optional().default(""),
      edu: z.string().max(1_000).optional().default(""),
      major: TextListSchema,
      specialty: TextListSchema,
      skill: TextListSchema,
      certificate: TextListSchema,
      other: z.union([z.string().max(10_000), z.array(z.string().max(2_000)).max(100)]).optional().default(""),
    }).passthrough(),
  }).passthrough(),
}).passthrough();

export type RawSearchJob = z.infer<typeof RawSearchJobSchema>;
export type RawDetailResponse = z.infer<typeof RawDetailResponseSchema>;
