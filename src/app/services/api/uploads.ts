import { requestMultipart } from './client';

/**
 * File-upload endpoints. Both round-trip through multer on the server
 * and return a `{ url }` payload — the URL is a data: URI (base64) so
 * Railway redeploys don't wipe uploaded content. The multipart helper
 * handles the bearer-token + 401 plumbing.
 */
export const uploadsApi = {
  async uploadLogo(file: File): Promise<string> {
    const data = await requestMultipart<{ url: string }>('/upload/logo', file, 'logo');
    return data.url;
  },

  /**
   * Upload a PDF document (used for player identity docs) and return
   * the persisted data URL.
   */
  async uploadDocument(file: File): Promise<string> {
    const data = await requestMultipart<{ url: string }>('/upload/document', file, 'document');
    return data.url;
  },
};
