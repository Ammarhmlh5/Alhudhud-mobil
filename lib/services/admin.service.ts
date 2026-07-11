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
    const res = await api.get('/admin/stats');
    if (!res.ok) throw new Error('فشل تحميل الإحصائيات');
    return res.json();
  },

  async getUsers(): Promise<AdminUser[]> {
    const res = await api.get('/admin/accounts');
    if (!res.ok) throw new Error('فشل تحميل الحسابات');
    return res.json();
  },

  async toggleUserStatus(userId: string, isActive: boolean): Promise<void> {
    const res = await api.request(`/admin/accounts/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
    if (!res.ok) throw new Error('فشل تحديث حالة الحساب');
  },

  async getLogs(limit = 50): Promise<AdminLog[]> {
    const res = await api.get(`/admin/logs?limit=${limit}`);
    if (!res.ok) throw new Error('فشل تحميل السجلات');
    return res.json();
  },

  async getWebhooks(limit = 50): Promise<AdminWebhook[]> {
    const res = await api.get(`/admin/webhooks?limit=${limit}`);
    if (!res.ok) throw new Error('فشل تحميل أحداث Webhook');
    return res.json();
  },
};
