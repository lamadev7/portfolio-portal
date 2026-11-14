/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Three.js is hefty; split it into its own chunk so the initial HTML payload
  // stays small. Section content streams in immediately, the 3D scene hydrates
  // afterward (see components/scene/SceneLoader.tsx).
  webpack: (config) => {
    config.module.rules.push({
      test: /\.glsl$/i,
      type: "asset/source",
    });
    return config;
  },
};

export default nextConfig;
