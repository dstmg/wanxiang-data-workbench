// Modified for Wanxiang local startup and test isolation, 2026-10-06.
/** @type {import('next').NextConfig} */

const nextConfig = {
  distDir: process.env.WANXIANG_NEXT_DIST_DIR || '.next',
  redirects: async () => {
    return [
      {
        source: "/",
        destination: "/wanxiang",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
