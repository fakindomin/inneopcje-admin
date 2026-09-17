import { redirect } from "next/navigation";
import ResultsHeader from "../../components/ResultsHeader";
import SearchResultsList from "../../components/SearchResultsList";
import { searchProducts, logSearch } from "../../lib/queries";

export async function generateMetadata({ searchParams }) {
  const params = await searchParams;
  const query = (params?.q ?? "").toString().trim();
  return { title: query ? `Wyniki dla „${query}” — innaopcja.pl` : "Wyniki wyszukiwania — innaopcja.pl" };
}

export default async function WynikiPage({ searchParams }) {
  const params = await searchParams;
  const query = (params?.q ?? "").toString().trim();

  if (!query) {
    redirect("/");
  }

  const results = await searchProducts(query);
  if (results.length === 0) {
    await logSearch(query);
  }

  return (
    <main className="max-w-[680px] mx-auto px-6 py-8">
      <ResultsHeader defaultValue={query} />

      {results.length > 0 ? (
        <SearchResultsList results={results} />
      ) : (
        <>
          <p className="text-lg font-medium mb-4 text-center">Wyniki wyszukiwania</p>
          <p className="text-sm text-brand-secondary text-center max-w-[420px] mx-auto">
            Nie mamy jeszcze produktu „{query}" w bazie. Zapisaliśmy zapytanie — pomoże nam to
            rozbudować listę.
          </p>
        </>
      )}
    </main>
  );
}
