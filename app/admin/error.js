"use client";

export default function AdminError({ error, reset }) {
  return (
    <main className="max-w-[600px] mx-auto px-6 py-16 text-center">
      <p className="text-lg font-medium text-brand-ink mb-2">Coś poszło nie tak</p>
      <p className="text-sm text-brand-muted mb-1">
        Operacja się nie powiodła (np. zapis trwał zbyt długo albo baza chwilowo nie odpowiedziała).
      </p>
      {error?.message && <p className="text-xs text-brand-muted mb-6 font-mono">{error.message}</p>}
      <button
        type="button"
        onClick={() => reset()}
        className="text-sm px-4 py-2 rounded-md border border-brand-ink hover:bg-brand-cream"
      >
        Spróbuj ponownie
      </button>
    </main>
  );
}
