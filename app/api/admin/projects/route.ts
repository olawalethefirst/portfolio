import { NextResponse } from "next/server";
import { withAdminApi } from "@/src/auth/admin-api";
import { listProjects } from "@/src/db/projects";

export const GET = withAdminApi(async () => NextResponse.json(await listProjects()));
