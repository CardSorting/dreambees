import { clerkPlugin } from 'vue-clerk/plugin'
import { defineNuxtPlugin, useRuntimeConfig } from '#app'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  
  if (!config.public.clerkPublishableKey) {
    console.error('Missing Clerk publishable key')
    return
  }

  nuxtApp.vueApp.use(clerkPlugin, {
    publishableKey: config.public.clerkPublishableKey,
    options: {
      appearance: {
        layout: {
          logoPlacement: 'inside',
          socialButtonsPlacement: 'bottom',
          socialButtonsVariant: 'iconButton'
        },
        variables: {
          colorPrimary: '#4f46e5'
        }
      }
    }
  })
})
