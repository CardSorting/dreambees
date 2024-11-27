// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt'
  ],
  // @ts-ignore - runtimeConfig is valid in Nuxt 3
  runtimeConfig: {
    // Private server-side config
    awsCloudFrontDomain: 'd2kp8efsbrxae1.cloudfront.net',
    public: {
      firebaseApiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID,
      firebaseMeasurementId: process.env.NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
      // Public config for CloudFront
      cloudFrontDomain: 'd2kp8efsbrxae1.cloudfront.net'
    }
  },
  postcss: {
    plugins: {
      'tailwindcss': {},
      'autoprefixer': {},
      'postcss-import': {}
    }
  },
  compatibilityDate: '2024-11-26'
})
