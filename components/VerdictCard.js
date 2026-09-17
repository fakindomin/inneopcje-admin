import { IconCheck, IconX } from "./icons";

export const PRICE_TIER_LABELS = {
  budzetowy: "budżetowy",
  sredni: "średni",
  premium: "premium",
};

function ceneoSearchUrl(name) {
  return `https://www.ceneo.pl/;szukaj-${encodeURIComponent(name).replace(/%20/g, "+")}`;
}

export default function VerdictCard({ product }) {
  const score = Number(product.score).toFixed(1);

  return (
    <div className="bg-white border border-brand-ink rounded-xl p-4 mb-5">
      <div className="flex items-start justify-between gap-4 mb-2.5">
        <div>
          <p className="font-medium text-lg text-brand-ink">{product.name}</p>
          {product.specs?.price_pln_approx && (
            <p className="text-xs text-brand-muted mt-0.5">{product.specs.price_pln_approx} zł</p>
          )}
        </div>
        <div className="w-14 h-14 rounded-full bg-brand-orange flex items-center justify-center shrink-0">
          <span className="text-brand-cream font-bold text-xl">{score}</span>
        </div>
      </div>

      <p className="font-medium text-sm text-brand-ink mb-1">{product.verdict}</p>
      <p className="text-sm text-brand-secondary leading-relaxed mb-2.5">{product.summary}</p>

      <div className="grid grid-cols-2 gap-4 border-t border-brand-border pt-2.5">
        <div>
          <div className="w-6 h-6 rounded-full bg-brand-orange flex items-center justify-center mb-1.5">
            <span className="text-brand-cream font-bold text-sm leading-none">+</span>
          </div>
          {product.pros.map((pro) => (
            <p key={pro} className="text-[13px] text-brand-ink flex gap-1.5 mb-0.5">
              <IconCheck className="text-green-700 mt-0.5 shrink-0" />
              {pro}
            </p>
          ))}
        </div>
        <div>
          <div className="w-6 h-6 rounded-full bg-brand-orange flex items-center justify-center mb-1.5">
            <span className="text-brand-cream font-bold text-sm leading-none">−</span>
          </div>
          {product.cons.map((con) => (
            <p key={con} className="text-[13px] text-brand-ink flex gap-1.5 mb-0.5">
              <IconX className="text-red-700 mt-0.5 shrink-0" />
              {con}
            </p>
          ))}
        </div>
      </div>

      <a
        href={ceneoSearchUrl(product.name)}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full text-center bg-brand-orange text-brand-cream rounded-md py-2 mt-3 text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Sprawdź na Ceneo
      </a>
    </div>
  );
}
