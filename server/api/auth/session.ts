import { defineEventHandler, readBody, createError } from 'h3'
import { getAuth } from 'firebase-admin/auth'

export default defineEventHandler(async (event) => {
  try {
    const { idToken } = await readBody(event)
    
    if (!idToken) {
      throw createError({
        statusCode: 400,
        message: 'ID token is required'
      })
    }

    // Create session cookie
    const expiresIn = 60 * 60 * 24 * 5 * 1000 // 5 days
    const sessionCookie = await getAuth().createSessionCookie(idToken, { expiresIn })

    // Set cookie
    event.node.res.setHeader('Set-Cookie', [
      `session=${sessionCookie}; Max-Age=${expiresIn}; HttpOnly; Path=/; SameSite=Lax${
        process.env.NODE_ENV === 'production' ? '; Secure' : ''
      }`
    ])

    return { success: true }
  } catch (error: any) {
    console.error('Failed to create session:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to create session'
    })
  }
})
