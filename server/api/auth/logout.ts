import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  // Clear session cookie by setting it to expire immediately
  event.node.res.setHeader('Set-Cookie', [
    'session=; Max-Age=0; HttpOnly; Path=/; SameSite=Lax' + 
    (process.env.NODE_ENV === 'production' ? '; Secure' : '')
  ])

  return { success: true }
})
