import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 removido — agora usamos Turso (@libsql/client) que funciona no edge e serverless
};

export default nextConfig;
