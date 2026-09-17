import Link from "next/link";
import { ANGLE_META } from "../lib/angles";
import { ANGLE_ICONS } from "./icons";

export default function AlternativeCard({ alt, fromSlug, fromName }) {
  const meta = ANGLE_META[alt.comparison_angle];
  const Icon = ANGLE_ICONS[meta.icon];
  const score = Number(alt.score).toFixed(1);

  const href = fromSlug
    ? `/telefon/${alt.slug}?from=${encodeURIComponent(fromSlug)}&fromName=${encodeURIComponent(fromName)}`
    : `/telefon/${alt.slug}`;

  return (
    <Link
      href={href}
      className="h-full flex flex-col bg-white border border-brand-ink rounded-xl p-3.5 hover:bg-brand-cream transition-colors"
    >
      <span className="inline-flex items-center gap-1 self-start rounded-full bg-brand-orange px-2.5 py-1 mb-1.5 text-[11px] font-medium text-brand-cream">
        {meta.label}
        <Icon className="text-brand-cream" />
      </span>
      <p className="font-medium text-sm text-brand-ink mb-0.5">{alt.name}</p>
      <p className="text-xs text-brand-muted mb-1.5">
        {alt.price_pln_approx} zł &middot; {score}/10
      </p>
      <p className="text-xs text-brand-secondary leading-relaxed">{alt.reason}</p>
    </Link>
  );
}
