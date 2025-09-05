import type { NextConfig } from "next";
import { generateCSP, defaultSecurityConfig } from './lib/security-headers';

const nextConfig: NextConfig = {
  // Experimental features for enhanced security
  experimental: {
    // Enable strict CSP in development
    strictNextHead: true,
  },
  
  // Webpack configuration for client-side exclusions
  webpack: (config: any, { isServer }: any) => {
    if (!isServer) {
      // Exclude Winston from client-side bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        util: false,
        winston: false,
      };
      
      // Ignore Winston modules on client side
      config.externals = config.externals || [];
      config.externals.push('winston');
    }
    
    return config;
  },
  
  // Enhanced security headers with comprehensive CSP
  async headers() {
    return [
      {
        // Apply comprehensive security headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: generateCSP(defaultSecurityConfig),
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'off',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'X-Download-Options',
            value: 'noopen',
          },
          {
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=()',
          },
        ],
      },
      // Production-only HSTS header - conditionally include the entire config object
      ...(process.env.NODE_ENV === 'production' ? [{
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          }
        ],
      }] : []),
      {
        // API-specific headers
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
