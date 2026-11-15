import { NextResponse } from "next/server";
import { withAdminApi } from "@/src/auth/admin-api";
import { listSeo } from "@/src/db/seo";

export const GET = withAdminApi(async () => NextResponse.json(await listSeo()));
