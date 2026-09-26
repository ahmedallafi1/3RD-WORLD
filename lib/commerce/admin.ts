import { notFound } from "next/navigation";

export function requireAdminPreview() {
  if (process.env.THIRD_WORLD_ADMIN_PREVIEW !== "true") {
    notFound();
  }
}
