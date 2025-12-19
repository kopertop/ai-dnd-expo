import { createServerFn } from '@tanstack/react-start'
import { getRequestUrl } from '@tanstack/react-start/server'

import { resolveApiBaseUrl } from './api-base-url'
import { useAuthSession, type AuthUser } from './session'

const joinApiPath = (baseUrl: string, path: string) => {
  const trimmed = path.startsWith('/') ? path.slice(1) : path
  return `${baseUrl}${trimmed}`
}

const getServerApiBaseUrl = () => {
  const requestUrl = new URL(getRequestUrl({ xForwardedHost: true }))
  const base = resolveApiBaseUrl(requestUrl.origin)
  if (base.startsWith('http')) {
    return base
  }
  return `${requestUrl.origin}${base.startsWith('/') ? '' : '/'}${base}`
}

export const fetchCurrentUser = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await useAuthSession()
    const token = session.data.deviceToken

    if (!token) {
      return null
    }

    const response = await fetch(joinApiPath(getServerApiBaseUrl(), '/me'), {
      headers: {
        Authorization: `Device ${token}`,
      },
    })

    if (response.status === 401 || response.status === 404) {
      await session.clear()
      return null
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.status}`)
    }

    const user = (await response.json()) as AuthUser
    await session.update({ user })
    return user
  },
)

type GoogleCallbackPayload = {
  code: string
  redirectUri: string
  codeVerifier?: string
}

export const completeGoogleLogin = createServerFn({ method: 'POST' })
  .inputValidator((data: GoogleCallbackPayload) => data)
  .handler(async ({ data }) => {
    const response = await fetch(
      joinApiPath(getServerApiBaseUrl(), '/auth/google/callback'),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: data.code,
          redirect_uri: data.redirectUri,
          code_verifier: data.codeVerifier,
        }),
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Google callback failed: ${response.status} ${errorText}`,
      )
    }

    const result = (await response.json()) as {
      deviceToken: string
      user: AuthUser
    }

    const session = await useAuthSession()
    await session.update({
      deviceToken: result.deviceToken,
      user: result.user,
    })

    return result.user
  })

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await useAuthSession()
  await session.clear()
})
