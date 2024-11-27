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
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    awsRegion: process.env.AWS_REGION,
    awsS3Bucket: process.env.AWS_S3_BUCKET,
    awsMediaConvertEndpoint: process.env.AWS_MEDIACONVERT_ENDPOINT,
    awsMediaConvertRole: process.env.AWS_MEDIACONVERT_ROLE,
    redisUrl: process.env.REDIS_URL,
    redisToken: process.env.REDIS_TOKEN,
    rabbitmqUrl: process.env.RABBITMQ_URL,
    openaiApiKey: process.env.OPENAI_API_KEY,
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
  // Configure app
  app: {
    // Enable page transitions
    pageTransition: { name: 'page', mode: 'out-in' }
  },
  // Configure nitro server
  nitro: {
    // Enable server-side middleware with proper CORS settings
    routeRules: {
      '/api/**': { 
        cors: true,
        headers: {
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Origin': process.env.NODE_ENV === 'development' 
            ? 'http://localhost:3000'
            : 'https://dreambees.ai',
          'Access-Control-Allow-Methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization'
        }
      }
    }
  },
  // Disable SSR since we're using Firebase auth
  ssr: false,
  // Configure build
  build: {
    transpile: ['firebase']
  },
  // Configure state serialization
  vite: {
    optimizeDeps: {
      exclude: ['firebase']
    }
  },
  pinia: {
    autoImports: ['defineStore', 'storeToRefs']
  },
  compatibilityDate: '2024-11-26'
})
