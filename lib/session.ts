import { cache } from "react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const getServerSession = cache(async () => {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({
    headers: reqHeaders,
  });
  return session;
});

export async function requireAuth() {
  const session = await getServerSession();
  if (!session || !session.user) {
    redirect("/login");
  }
  return session;
}
