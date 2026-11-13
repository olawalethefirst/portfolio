import type { NextResponse } from "next/server";

/** Preserve SDK session writes when choosing a different outgoing response. */
export function applySessionResponse(session: NextResponse, response: NextResponse) {
  session.headers.forEach((value, name) => {
    if (name !== "set-cookie") response.headers.set(name, value);
  });
  for (const cookie of session.cookies.getAll()) response.cookies.set(cookie);
  return response;
}
