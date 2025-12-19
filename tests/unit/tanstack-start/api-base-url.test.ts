import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { resolveApiBaseUrl } from '../../../tanstack-app/src/utils/api-base-url'

const originalEnv = { ...process.env }

const resetEnv = () => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key]
    }
  }
  Object.assign(process.env, originalEnv)
}

describe('resolveApiBaseUrl', () => {
  beforeEach(() => {
    resetEnv()
  })

  afterEach(() => {
    resetEnv()
  })

  it('uses explicit base URL when configured', () => {
    process.env.VITE_API_BASE_URL = 'http://localhost:8787/api'
    expect(resolveApiBaseUrl()).toBe('http://localhost:8787/api/')
  })

  it('defaults to /api/ when no explicit base is provided', () => {
    expect(resolveApiBaseUrl()).toBe('/api/')
  })

  it('uses origin when provided', () => {
    expect(resolveApiBaseUrl('https://example.com')).toBe(
      'https://example.com/api/',
    )
  })
})
