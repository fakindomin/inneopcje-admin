import Link from "next/link";
import Logo from "../components/Logo";
import SearchBox from "../components/SearchBox";

export default function HomePage() {
  return (
    <main className="min-h-dvh flex flex-col items-center px-6 pt-16 sm:pt-24 pb-16">
      <Logo width={100} height={79} label="innaopcja.pl" />

      <p className="text-sm text-brand-secondary text-center max-w-[420px] mt-6">
        Znajdź lepszą opcję dla produktu, który Cię interesuje.
      </p>

      <form action="/wyniki" method="GET" className="w-full max-w-[420px] mt-8">
        <SearchBox />
        <div className="flex justify-center mt-4">
          <button
            type="submit"
            className="bg-transparent border border-brand-ink rounded-md px-4 py-1.5 text-sm font-medium hover:bg-white"
          >
            <span className="text-brand-ink">Inne</span> <span className="text-brand-orange">Opcje</span>
          </button>
        </div>
      </form>

      <Link
        href="/wybierz/telefony"
        className="mt-4 bg-transparent border border-brand-ink rounded-md px-4 py-1.5 text-sm font-medium text-brand-ink hover:bg-white"
      >
        Nie wiem, czego chcę
      </Link>

      <Link
        href="/polityka-prywatnosci"
        className="text-xs text-brand-muted hover:text-brand-secondary mt-auto pt-10"
      >
        Polityka prywatności
      </Link>
    </main>
  );
}
