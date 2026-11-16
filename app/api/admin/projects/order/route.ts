import { NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/src/api/errors";
import { withContentType, withSameOrigin } from "@/src/api/request";
import { withAdminApi } from "@/src/auth/admin-api";
import { listProjects, reorderProjects } from "@/src/db/projects";

/** Order is collection state; the body replaces it, so PUT is idempotent. */
export const PUT = withSameOrigin(
  withContentType(
    "application/json",
    withAdminApi(async (request) => {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return apiErrorResponse({
          code: "INVALID_REQUEST",
          message: "Provide a valid JSON body.",
        });
      }
      const parsed = z.strictObject({ ids: z.array(z.uuid()) }).safeParse(body);
      if (!parsed.success)
        return apiErrorResponse({
          code: "INVALID_REQUEST",
          message: "Provide every Project ID in the intended order.",
        });
      const { status } = await reorderProjects(parsed.data.ids);
      return status === "saved"
        ? NextResponse.json(await listProjects())
        : apiErrorResponse({
            code: "CONFLICT",
            message: "The Project list changed. Reload it and order again.",
          });
    }),
  ),
);
