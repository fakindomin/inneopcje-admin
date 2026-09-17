import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  async redirects() {
    return [
      {
        source: "/telefon/:slug",
        destination: "/produkt/:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
