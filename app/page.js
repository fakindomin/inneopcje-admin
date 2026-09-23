import Link from "next/link";
import Logo from "../components/Logo";
import HomeTiles from "../components/HomeTiles";

export default function HomePage() {
  return (
    <main className="min-h-dvh flex flex-col items-center px-6 pt-16 sm:pt-24 pb-16">
      <Logo width={100} height={79} label="innaopcja.pl" />

      <p className="text-sm text-brand-secondary text-center max-w-[420px] mt-6">
        Znajdź lepszą opcję dla produktu, który Cię interesuje.
      </p>

      <HomeTiles />

      <Link
        href="/polityka-prywatnosci"
        className="text-xs text-brand-muted hover:text-brand-secondary mt-auto pt-10"
      >
        Polityka prywatności
      </Link>
    </main>
  );
}
