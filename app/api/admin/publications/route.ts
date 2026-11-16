import { NextResponse } from "next/server";
import { withAdminApi } from "@/src/auth/admin-api";
import { listPublications } from "@/src/db/publications";

export const GET = withAdminApi(async () =>
  NextResponse.json(await listPublications()),
);
