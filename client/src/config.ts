// Environment-based API configuration
const config = {
  // API base URL based on environment
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',

  // Environment detection
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,

  // API endpoints
  endpoints: {
    payment: '/accept-payment',
    webhook: '/payment-callback',
    health: '/test',
  },
}

export default config
