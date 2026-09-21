/** @type {import('next').NextConfig} */
const nextConfig = {
  // gray-matter runs only on the server; keep it out of the client bundle.
  serverExternalPackages: ['gray-matter'],
  // The app is a local, single-user window onto Markdown files — no image optimization server needed.
  images: { unoptimized: true },
};

export default nextConfig;
