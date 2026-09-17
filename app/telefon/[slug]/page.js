import { notFound } from "next/navigation";
import PhoneExplorer from "../../../components/PhoneExplorer";
import { getProductBySlug, getAlternatives } from "../../../lib/queries";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  return { title: `${product.name} — innaopcja.pl` };
}

export default async function TelefonPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const product = await getProductBySlug(slug);
  if (!product) {
    notFound();
  }

  const alternatives = await getAlternatives(product.id);
  const backTo = sp?.from ? { slug: sp.from, name: sp.fromName ?? sp.from } : null;

  return <PhoneExplorer initialProduct={product} initialAlternatives={alternatives} backTo={backTo} />;
}
