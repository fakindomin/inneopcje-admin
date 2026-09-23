import { notFound } from "next/navigation";
import PhoneExplorer from "../../../components/PhoneExplorer";
import { getProductBySlug, getAlternatives } from "../../../lib/queries";
import { otherBrandPicksForProduct } from "../../../lib/wizardMatch.js";
import { ANGLE_ORDER } from "../../../lib/angles.js";

// Parses the wizard's own profile from ?wprofile= (see
// components/PhoneWizard.js's "Zobacz pełne zestawienie" link) - garbage,
// missing, or a profile with only one selected producent all just mean
// "nothing to prefer here", not an error worth surfacing to the visitor.
function parseWizardProfile(raw) {
  if (typeof raw !== "string") return null;
  try {
    const profile = JSON.parse(raw);
    return Array.isArray(profile?.producent) && profile.producent.length > 1 ? profile : null;
  } catch {
    return null;
  }
}

// Prefers a wizard-selected brand's own pick over the generic cached one
// for the SAME angle (tansza/wyzsza_jakosc) - and fills that angle's slot
// if the cache didn't have one at all - rather than adding extra cards
// alongside the existing ones, so the grid never grows past its normal
// (at most 3) Taniej/Lepiej/Inaczej cards. "Inaczej" (niszowa_marka) is
// never touched since findOtherBrandPicks never produces one.
function preferWizardPicks(alternatives, wizardPicks) {
  if (wizardPicks.length === 0) return alternatives;
  const byAngle = new Map(alternatives.map((a) => [a.comparison_angle, a]));
  for (const pick of wizardPicks) byAngle.set(pick.comparison_angle, pick);
  return ANGLE_ORDER.map((angle) => byAngle.get(angle)).filter(Boolean);
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  return { title: `${product.name} — innaopcja.pl` };
}

export default async function ProductPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const product = await getProductBySlug(slug);
  if (!product) {
    notFound();
  }

  let alternatives = await getAlternatives(product.id);
  const wizardProfile = parseWizardProfile(sp?.wprofile);
  if (wizardProfile) {
    const wizardPicks = await otherBrandPicksForProduct(product, wizardProfile);
    alternatives = preferWizardPicks(alternatives, wizardPicks);
  }

  const backTo = sp?.from ? { slug: sp.from, name: sp.fromName ?? sp.from } : null;

  return <PhoneExplorer initialProduct={product} initialAlternatives={alternatives} backTo={backTo} />;
}
