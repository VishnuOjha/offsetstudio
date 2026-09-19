import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root to this folder. Without it, a stray
  // package-lock.json in your home directory makes Turbopack treat the
  // whole home folder as the project root (slow file watching).
  turbopack: { root },
};
export default nextConfig;