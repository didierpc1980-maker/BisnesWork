import type { z } from "zod";

import { ApiError } from "./errors";

export function parseWith<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join(".") ?? "";

    throw new ApiError(
      400,
      issue
        ? path
          ? `${path}: ${issue.message}`
          : issue.message
        : "Datos no válidos.",
    );
  }

  return result.data;
}
