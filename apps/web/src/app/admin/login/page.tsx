import { loginAction } from "../actions";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { redirect } from "next/navigation";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAdminAuthenticated()) {
    redirect("/admin");
  }

  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-[var(--margin-page)]">
      <div className="panel w-full max-w-md p-8">
        <h1 className="font-display text-2xl text-text">Admin login</h1>
        <p className="mt-2 text-sm text-muted">
          Enter the admin secret to review discovered contacts and send outreach.
        </p>
        {params.error === "invalid" && (
          <p className="mt-4 text-sm text-accent">Invalid password.</p>
        )}
        <form action={loginAction} className="mt-6 space-y-4">
          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-muted">
              Admin secret
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="input-field w-full"
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn-secondary w-full">
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
