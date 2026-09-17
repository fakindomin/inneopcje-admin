import Link from "next/link";
import Logo from "../../components/Logo";

export const metadata = {
  title: "Polityka prywatności — innaopcja.pl",
};

export default function PolitykaPrywatnosciPage() {
  return (
    <main className="max-w-[680px] mx-auto px-6 py-8">
      <Link href="/" className="flex items-center gap-1.5 mb-6">
        <Logo width={20} height={16} />
        <span className="text-[13px] font-medium text-brand-ink">
          innaopcja<span className="text-brand-orange">.pl</span>
        </span>
      </Link>

      <p className="text-lg font-medium mb-4">Polityka prywatności</p>

      <div className="space-y-4 text-sm text-brand-secondary leading-relaxed">
        <section>
          <p className="font-medium text-brand-ink mb-1">1. Administrator danych</p>
          <p>
            Administratorem serwisu innaopcja.pl jest Dominik Chróścik, kontakt:{" "}
            <a href="mailto:fakindomin@gmail.com" className="text-brand-orange">
              fakindomin@gmail.com
            </a>
            .
          </p>
        </section>

        <section>
          <p className="font-medium text-brand-ink mb-1">2. Jakie dane zbieramy</p>
          <p>
            Gdy wyszukiwana fraza nie pasuje do żadnego produktu w naszej bazie, zapisujemy samą
            treść zapytania (bez adresu IP ani innych danych identyfikujących użytkownika), aby
            wiedzieć, jakie produkty warto dodać do serwisu w przyszłości.
          </p>
        </section>

        <section>
          <p className="font-medium text-brand-ink mb-1">3. Pliki cookie</p>
          <p>
            Serwis nie używa własnych plików cookie do śledzenia użytkowników ani do celów
            reklamowych.
          </p>
        </section>

        <section>
          <p className="font-medium text-brand-ink mb-1">4. Linki do sklepów zewnętrznych</p>
          <p>
            Przycisk „Idź do sklepu” przenosi do wyników wyszukiwania na Ceneo.pl — serwisie
            zewnętrznym, który ma własną politykę prywatności i własne zasady przetwarzania
            danych, niezależne od innaopcja.pl.
          </p>
        </section>

        <section>
          <p className="font-medium text-brand-ink mb-1">5. Twoje prawa</p>
          <p>
            Zgodnie z RODO masz prawo do dostępu do swoich danych, ich sprostowania, usunięcia lub
            ograniczenia przetwarzania. W tym celu skontaktuj się z nami pod adresem podanym w
            punkcie 1.
          </p>
        </section>
      </div>
    </main>
  );
}
