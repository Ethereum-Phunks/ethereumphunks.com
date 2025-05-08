/**
 * Mapping of MIME types to simple string types
 */
export const MIME_TYPE_MAP: Record<string, string> = {
  'text/plain': 'text',
  'text/html': 'html',
  'application/json': 'json',
  'message/vnd.tic+json': 'json',
  'image/png': 'image',
  'image/svg+xml': 'image',
  'image/jpg': 'image',
  'image/jpeg': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
  'video/mp4': 'video',
  'video/webm': 'video',
  '': 'text', // fallback for empty mimetype
};

/**
 * Type for the result of decodeDataURI
 */
export type DecodedData = {
  type: (typeof MIME_TYPE_MAP)[keyof typeof MIME_TYPE_MAP];
  mimeType: string;
  data: string;
};
