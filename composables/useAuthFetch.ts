import { useAuth } from 'vue-clerk'
import type { UseFetchOptions } from '#app'
import type { FetchContext } from 'ofetch'

export function useAuthFetch<T = any>(url: string, opts: UseFetchOptions<T> = {}) {
  const { getToken } = useAuth()

  // Skip auth header for public endpoints
  const isPublicEndpoint = url.includes('/api/auth/') || 
                          url.includes('/_nuxt/')

  const options: UseFetchOptions<T> = {
    ...opts,
    async onRequest(ctx: FetchContext) {
      if (!isPublicEndpoint) {
        try {
          const token = await getToken.value
          if (token) {
            ctx.options.headers = new Headers(ctx.options.headers || {})
            ctx.options.headers.set('Authorization', `Bearer ${token}`)
          }
        } catch (error) {
          console.error('Error getting auth token:', error)
        }
      }
    }
  }

  return useFetch(url, options)
}
