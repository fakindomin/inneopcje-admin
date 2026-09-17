import { getPool } from "../lib/db";
import { SITE_URL } from "../lib/site";

export default async function sitemap() {
  const pool = getPool();
  const result = await pool.query(`SELECT slug FROM products WHERE status = 'published'`);

  const productUrls = result.rows.map((row) => ({
    url: `${SITE_URL}/telefon/${row.slug}`,
  }));

  return [
    { url: SITE_URL },
    { url: `${SITE_URL}/polityka-prywatnosci` },
    ...productUrls,
  ];
}
