import { supabase } from './supabase';
import { Platform } from 'react-native';

export type StorageBucket = 'avatars' | 'posts' | 'stories' | 'documents' | 'evidence';

/**
 * Uploads an image/file from Expo ImagePicker or local URI to Supabase Storage.
 * Compatible with React Native (iOS & Android) and Web.
 */
export async function uploadImageToSupabase(
  bucket: StorageBucket,
  uri: string,
  customFileName?: string
): Promise<{ path: string; publicUrl: string; error: Error | null }> {
  try {
    const ext = uri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
    const fileName = customFileName || `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    const filePath = fileName;

    let fileBody: Blob | ArrayBuffer;

    if (Platform.OS === 'web') {
      const res = await fetch(uri);
      fileBody = await res.blob();
    } else {
      // In React Native / Expo, fetch on local file:// URI yields a Blob
      const res = await fetch(uri);
      fileBody = await res.blob();
    }

    const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileBody, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      console.error(`Error uploading to ${bucket}:`, error.message);
      return { path: '', publicUrl: '', error: new Error(error.message) };
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      path: data.path,
      publicUrl: urlData.publicUrl,
      error: null,
    };
  } catch (err: any) {
    console.error('uploadImageToSupabase exception:', err);
    return { path: '', publicUrl: '', error: err };
  }
}

/**
 * Retrieves the public URL for a file in a public bucket (avatars, posts, stories).
 */
export function getPublicStorageUrl(bucket: StorageBucket, path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Creates a temporary signed URL for a private bucket file (documents, evidence).
 */
export async function getSignedStorageUrl(
  bucket: StorageBucket,
  path: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data) {
    console.error(`Failed to generate signed URL for ${bucket}/${path}:`, error?.message);
    return null;
  }
  return data.signedUrl;
}

/**
 * Removes one or more files from a Supabase storage bucket.
 */
export async function deleteStorageFiles(
  bucket: StorageBucket,
  paths: string[]
): Promise<boolean> {
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) {
    console.error(`Failed to delete files in ${bucket}:`, error.message);
    return false;
  }
  return true;
}
