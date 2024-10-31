/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    },
    
    config.output.webassemblyModuleFilename = (isServer ? '../' : '') + 'static/wasm/[modulehash].wasm'
    return config
  },
}

module.exports = nextConfig
