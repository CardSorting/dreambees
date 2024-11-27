import { clerkPlugin } from 'vue-clerk/plugin'
import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin((nuxtApp) => {
  const runtimeConfig = useRuntimeConfig()
  
  nuxtApp.vueApp.use(clerkPlugin, {
    publishableKey: runtimeConfig.public.clerk?.publishableKey,
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
