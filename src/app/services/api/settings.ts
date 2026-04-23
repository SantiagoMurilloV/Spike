import { request } from './client';
import type { SystemSettings } from './dtos';

/**
 * Global system settings — shown on the admin Ajustes page. Affects
 * branding strings (system name, club name) and VAPID/contact info
 * shown in the public header.
 */
export const settingsApi = {
  async getSettings(): Promise<SystemSettings> {
    return request<SystemSettings>('/settings');
  },

  async updateSettings(data: Partial<SystemSettings>): Promise<SystemSettings> {
    return request<SystemSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};
