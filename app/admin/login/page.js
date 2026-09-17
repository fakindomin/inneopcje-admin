import { redirect } from "next/navigation";
import { verifyPassword, createSession } from "../../../lib/adminAuth.js";

async function loginAction(formData) {
  "use server";
  const password = (formData.get("password") || "").toString();
  if (!(await verifyPassword(password))) {
    redirect("/admin/login?error=1");
  }
  await createSession();
  redirect("/admin");
}

export default async function AdminLoginPage({ searchParams }) {
  const params = await searchParams;
  const error = params?.error === "1";

  return (
    <main className="max-w-[360px] mx-auto px-6 py-20">
      <p className="text-lg font-medium mb-6 text-center">
        <span className="text-brand-ink">Admin</span> <span className="text-brand-orange">innaopcja.pl</span>
      </p>
      <form action={loginAction} className="flex flex-col gap-3">
        <input
          type="password"
          name="password"
          placeholder="Hasło"
          autoFocus
          className="border border-brand-ink rounded-md px-3 py-2 text-sm bg-white"
        />
        <button
          type="submit"
          className="bg-brand-ink text-brand-cream rounded-md px-3 py-2 text-sm font-medium hover:opacity-90"
        >
          Zaloguj
        </button>
      </form>
      {error && <p className="text-sm text-red-700 mt-4 text-center">Błędne hasło.</p>}
    </main>
  );
}
