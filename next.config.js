/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Supabase Auth email links hit /auth/v1/verify on the same domain.
    // We proxy those requests to Kong (Supabase API gateway) running on the host.
    const kong = process.env.SUPABASE_KONG_ORIGIN || 'http://172.17.0.1:8000';
    return [
      {
        source: '/auth/v1/:path*',
        destination: `${kong}/auth/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
