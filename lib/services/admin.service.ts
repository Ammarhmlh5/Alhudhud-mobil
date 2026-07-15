import { api } from '../apiClient';

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalMessages: number;
  totalWebhooks: number;
  totalConnectors: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: number;
  created_at: string;
  plan: string;
  sub_status: string;
}

export interface AdminLog {
  id: string;
  user_id: string;
  email: string;
  connector_name: string | null;
  direction: string;
  status: string;
  payload: string;
  error_message: string | null;
  created_at: string;
}

export interface AdminWebhook {
  id: string;
  connector_id: string | null;
  user_id: string;
  email: string;
  connector_name: string | null;
  method: string;
  body: string;
  source_ip: string;
  created_at: string;
}

export const adminService = {
  async getStats(): Promise<AdminStats> {
    return api.get<AdminStats>('/admin/stats');
  },

  async getUsers(): Promise<AdminUser[]> {
    return api.get<AdminUser[]>('/admin/accounts');
  },

  async toggleUserStatus(userId: string, isActive: boolean): Promise<void> {
    const res = await api.request(`/admin/accounts/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
    if (!res.ok) throw new Error('فشل تحديث حالة الحساب');
  },

  async getLogs(limit = 50): Promise<AdminLog[]> {
    return api.get<AdminLog[]>(`/admin/logs?limit=${limit}`);
  },

  async getWebhooks(limit = 50): Promise<AdminWebhook[]> {
    return api.get<AdminWebhook[]>(`/admin/webhooks?limit=${limit}`);
  },
};
