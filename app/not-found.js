import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 text-center">
      <p className="text-lg font-medium mb-2">Nie znaleziono strony</p>
      <p className="text-sm text-brand-secondary mb-6">Ten produkt nie istnieje w naszej bazie.</p>
      <Link href="/" className="text-sm text-brand-orange font-medium">
        Wróć do wyszukiwania
      </Link>
    </main>
  );
}
