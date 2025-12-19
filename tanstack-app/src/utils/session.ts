import { useSession } from '@tanstack/react-start/server'

export type AuthUser = {
  id: string
  email: string
  name: string
  picture?: string
  is_admin?: boolean
}

export type AuthSessionData = {
  deviceToken?: string
  user?: AuthUser
}

const getSessionPassword = () => {
  return process.env.SESSION_SECRET || 'dev-session-secret'
}

export const useAuthSession = () => {
  return useSession<AuthSessionData>({
    name: 'ai-dnd-session',
    password: getSessionPassword(),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    },
  })
}
