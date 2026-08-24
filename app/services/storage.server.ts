/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright Oxide Computer Company
 */

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Unable to generate image URLs without ${name} configured`)
  return value
}

export async function getExpiringUrl(path: string, ttlInSeconds: number): Promise<string> {
  const key = decodeURI(path)
  if (key.split('/').includes('..')) throw new Error('Invalid storage path')

  const client = new S3Client({
    endpoint: requiredEnv('STORAGE_URL'),
    region: requiredEnv('STORAGE_REGION'),
    credentials: {
      accessKeyId: requiredEnv('STORAGE_ACCESS_KEY_ID'),
      secretAccessKey: requiredEnv('STORAGE_SECRET_ACCESS_KEY'),
    },
    forcePathStyle: true,
  })

  return await getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: requiredEnv('STORAGE_BUCKET'),
      Key: key,
    }),
    { expiresIn: ttlInSeconds },
  )
}
