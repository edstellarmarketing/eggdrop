'use server'

import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET = 'avatars'
let bucketReady = false

async function ensureBucket(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (bucketReady) return { ok: true }
  const supabase = createAdminClient()
  const { data } = await supabase.storage.getBucket(BUCKET)
  if (data) {
    bucketReady = true
    return { ok: true }
  }
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
  })
  if (error && !/already exists/i.test(error.message)) {
    return { ok: false, error: `Bucket setup failed: ${error.message}` }
  }
  bucketReady = true
  return { ok: true }
}

export async function uploadAvatarAction(formData: FormData) {
  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return { error: 'No file provided' }
  }
  if (file.size > 5 * 1024 * 1024) {
    return { error: 'File too large (max 5 MB)' }
  }
  if (!file.type.startsWith('image/')) {
    return { error: 'File must be an image' }
  }

  const bucket = await ensureBucket()
  if (!bucket.ok) return { error: bucket.error }

  const ext = (file.name.split('.').pop() || 'png').toLowerCase()
  const safeExt = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext) ? ext : 'png'
  const path = `${crypto.randomUUID()}.${safeExt}`

  const supabase = createAdminClient()
  const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (uploadErr) {
    return { error: `Upload failed: ${uploadErr.message}` }
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { success: true as const, url: urlData.publicUrl, path }
}
