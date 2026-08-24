/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright Oxide Computer Company
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

import { getExpiringUrl } from './storage.server'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

describe('Image url signing', () => {
  it('generates a scoped S3 URL without exposing the secret access key', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-23T12:00:00Z'))
    vi.stubEnv('STORAGE_URL', 'https://assets.example.com')
    vi.stubEnv('STORAGE_REGION', 'us-east-1')
    vi.stubEnv('STORAGE_BUCKET', 'rfd-assets')
    vi.stubEnv('STORAGE_ACCESS_KEY_ID', 'rfd-site')
    vi.stubEnv('STORAGE_SECRET_ACCESS_KEY', 'backend-only-secret')

    const signedUrl = await getExpiringUrl('rfd/123/latest/file with spaces.png', 3600)
    const encodedSourceUrl = await getExpiringUrl(
      'rfd/123/latest/file%20with%20spaces.png',
      3600,
    )
    const url = new URL(signedUrl)

    expect(encodedSourceUrl).toBe(signedUrl)
    expect(url.origin + url.pathname).toBe(
      'https://assets.example.com/rfd-assets/rfd/123/latest/file%20with%20spaces.png',
    )
    expect(url.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256')
    expect(url.searchParams.get('X-Amz-Expires')).toBe('3600')
    expect(url.searchParams.get('X-Amz-Credential')).toContain(
      'rfd-site/20260823/us-east-1/s3/aws4_request',
    )
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[a-f0-9]{64}$/)
    expect(signedUrl).not.toContain('backend-only-secret')
  })

  it('rejects paths that could escape the authorized RFD prefix', async () => {
    await expect(
      getExpiringUrl('rfd/123/latest/../../../rfd/999/secret.png', 3600),
    ).rejects.toThrow('Invalid storage path')
  })
})
