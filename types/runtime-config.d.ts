declare module '@nuxt/schema' {
  interface PublicRuntimeConfig {
    firebaseApiKey: string
    firebaseAuthDomain: string
    firebaseProjectId: string
    firebaseStorageBucket: string
    firebaseMessagingSenderId: string
    firebaseAppId: string
    firebaseMeasurementId: string
  }
}
