import type { NextConfig } from 'next';
const config: NextConfig = {
 output: 'export',
 trailingSlash: true,
 distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
 images: { unoptimized: true },
};
export default config;
