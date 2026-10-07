import { notFound } from "next/navigation";
import ProductView from "../../../components/ProductView.js";
import { getProductBySlug, getAlternatives } from "../../../lib/queries";

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

  // Platforms chosen in the wizard, carried forward as a query param through
  // every "Inne Opcje" hop (see GryWizard.js/ProductView.js/AlternativeCard.js)
  // so alternatives stay restricted to what the user can actually play.
  const platformy = sp?.platformy ? sp.platformy.split(",").filter(Boolean) : [];

  const alternatives = await getAlternatives(product, platformy);
  const backTo = sp?.from ? { slug: sp.from, name: sp.fromName ?? sp.from } : null;

  return <ProductView product={product} alternatives={alternatives} backTo={backTo} platformy={platformy} />;
}
