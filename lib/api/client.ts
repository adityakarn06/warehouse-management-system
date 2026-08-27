import type { z } from "zod";

import { apiErrorSchema, apiListSuccessSchema, apiSuccessSchema } from "@/schemas/envelope.schema";
import type { PaginationMeta } from "@/schemas/common.schema";

import { API_BASE_URL } from "./config";
import { ApiError } from "./errors";

type QueryValue = string | number | boolean | undefined | null;
export type QueryParams = Record<string, QueryValue>;

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: QueryParams;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: QueryParams): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/**
 * Performs the request and returns the raw, still-unvalidated JSON body.
 * Throws `ApiError` for a backend error envelope (`code: "HTTP"`, real
 * status) or a network failure (`code: "NETWORK"`, `status: -1`).
 * `AbortError` is rethrown as-is so TanStack Query cancellation still works.
 */
async function requestRaw(path: string, options: RequestOptions = {}): Promise<unknown> {
  const { method = "GET", body, query, signal } = options;
  const url = buildUrl(path, query);

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(err instanceof Error ? err.message : "Network request failed", {
      status: -1,
      code: "NETWORK",
    });
  }

  const json: unknown = await res.json().catch(() => undefined);

  if (!res.ok) {
    const parsed = apiErrorSchema.safeParse(json);
    if (parsed.success) {
      throw new ApiError(parsed.data.error.message, {
        status: parsed.data.error.status,
        code: "HTTP",
        details: parsed.data.error.details,
      });
    }
    throw new ApiError(`Request to ${path} failed with status ${res.status}`, {
      status: res.status,
      code: "HTTP",
    });
  }

  return json;
}

/**
 * A response that parsed as JSON but not as its schema. The Zod issues are the
 * only thing that says *which* field diverged, and nothing renders
 * `ApiError.details`, so surface them in development rather than losing them.
 */
function validationError(path: string, issues: z.core.$ZodIssue[]): ApiError {
  if (process.env.NODE_ENV !== "production") {
    console.error(`[api] response from ${path} did not match the expected shape`, issues);
  }
  return new ApiError(`Response from ${path} did not match the expected shape`, {
    status: 0,
    code: "VALIDATION",
    details: issues,
  });
}

/** GET (or any single-resource call) that unwraps `{ data }` through `schema`. */
export async function apiGet<S extends z.ZodTypeAny>(
  path: string,
  schema: S,
  options: Omit<RequestOptions, "method" | "body"> = {},
): Promise<z.infer<S>> {
  const json = await requestRaw(path, { ...options, method: "GET" });
  const parsed = apiSuccessSchema(schema).safeParse(json);
  if (!parsed.success) {
    throw validationError(path, parsed.error.issues);
  }
  return (parsed.data as { data: z.infer<S> }).data;
}

/** GET that unwraps `{ data: [...], meta }` through `itemSchema`. */
export async function apiGetList<S extends z.ZodTypeAny>(
  path: string,
  itemSchema: S,
  options: Omit<RequestOptions, "method" | "body"> = {},
): Promise<{ data: z.infer<S>[]; meta: PaginationMeta }> {
  const json = await requestRaw(path, { ...options, method: "GET" });
  const parsed = apiListSuccessSchema(itemSchema).safeParse(json);
  if (!parsed.success) {
    throw validationError(path, parsed.error.issues);
  }
  return parsed.data;
}

/** POST/PATCH/DELETE that unwraps `{ data }` through `schema`. `body` is optional — some
 * commands (e.g. dock-assignment) accept an empty request. */
export async function apiSend<S extends z.ZodTypeAny>(
  method: "POST" | "PATCH" | "DELETE",
  path: string,
  schema: S,
  body?: unknown,
  options: Omit<RequestOptions, "method" | "body"> = {},
): Promise<z.infer<S>> {
  const json = await requestRaw(path, { ...options, method, body });
  const parsed = apiSuccessSchema(schema).safeParse(json);
  if (!parsed.success) {
    throw validationError(path, parsed.error.issues);
  }
  return (parsed.data as { data: z.infer<S> }).data;
}
