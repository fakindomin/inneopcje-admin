import { getPool } from "../lib/db";
import { SITE_URL } from "../lib/site";

// Queries the DB, so it can't be statically prerendered at build time -
// preview deployments never get DATABASE_URL (it's production-only in
// Vercel project settings), which made every preview build fail here
// regardless of what else changed. Forcing dynamic rendering defers the
// query to request time instead, on every environment.
export const dynamic = "force-dynamic";

export default async function sitemap() {
  const pool = getPool();
  const result = await pool.query(`SELECT slug FROM products WHERE status = 'published'`);

  const productUrls = result.rows.map((row) => ({
    url: `${SITE_URL}/produkt/${row.slug}`,
  }));

  return [
    { url: SITE_URL },
    { url: `${SITE_URL}/polityka-prywatnosci` },
    ...productUrls,
  ];
}
