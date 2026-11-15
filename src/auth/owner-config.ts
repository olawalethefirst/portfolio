import "server-only";

export function requireAdminUserId(): string {
  const ownerId = process.env.ADMIN_USER_ID?.trim();
  if (!ownerId) throw new Error("Studio owner is not configured.");
  return ownerId;
}
