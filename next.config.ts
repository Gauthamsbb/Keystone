import type { NextConfig } from "next";
import os from "os";
import path from "path";

// iCloud Drive on Desktop interferes with .next writes (actively re-applying old cloud copies).
// In dev mode, redirect build output to the OS temp dir which iCloud does not sync.
const distDir =
  process.env.NODE_ENV === "production"
    ? ".next"
    : path.join(os.tmpdir(), "gtrack-import-next");

const nextConfig: NextConfig = {
  distDir,
};

export default nextConfig;
