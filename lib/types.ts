// ============================================================
// AlHudhud Connect — Centralized TypeScript Types
// ============================================================

// ─── User & Auth ────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  is_active: boolean;
  auth_provider: 'local' | 'google';
  google_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: Pick<User, 'id' | 'email' | 'name' | 'role'>;
  apiKey?: string;
  isNewDevice?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  deviceInfo?: DeviceInfo;
}

export interface LoginData {
  email: string;
  password: string;
  deviceInfo?: DeviceInfo;
}

// ─── Device ─────────────────────────────────────────────────

export interface DeviceInfo {
  serialNumber?: string;
  ipAddress?: string;
  deviceName?: string;
  deviceModel?: string;
  osName?: string;
  osVersion?: string;
  appVersion?: string;
}

export interface Device {
  id: string;
  user_id: string;
  api_key: string;
  serial_number?: string;
  ip_address?: string;
  device_name?: string;
  device_model?: string;
  os_name?: string;
  os_version?: string;
  app_version?: string;
  is_active: boolean;
  last_active_at?: string;
  created_at: string;
}

// ─── Connector ──────────────────────────────────────────────

export type ConnectorProtocol = 'REST' | 'WebSocket' | 'OAuth2';
export type ConnectorAuthType = 'NONE' | 'API_KEY' | 'BASIC' | 'BEARER' | 'OAUTH2';
export type ConnectorStatus = 'UNKNOWN' | 'ONLINE' | 'OFFLINE' | 'ERROR';
export type PlatformType = 'Messaging' | 'Productivity' | 'Development' | 'Custom';

export interface Connector {
  id: string;
  user_id: string;
  name: string;
  platform_type: PlatformType;
  protocol: ConnectorProtocol;
  endpoint_url: string;
  http_method: string;
  headers: string; // JSON string
  auth_type: ConnectorAuthType;
  auth_config: string; // JSON string
  data_mapping?: string; // JSON string
  sync_interval?: number | null;
  is_active: boolean;
  last_status: ConnectorStatus;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ConnectorConfig {
  id: string;
  name: string;
  platformType: PlatformType;
  protocol: ConnectorProtocol;
  endpointUrl: string;
  httpMethod: string;
  headers: Record<string, string>;
  authType: ConnectorAuthType;
  authConfig: Record<string, any>;
  dataMapping?: DataMappingRule[];
  syncInterval?: number;
  isActive: boolean;
  lastStatus: ConnectorStatus;
}

export interface DataMappingRule {
  sourceField: string;
  targetField: string;
  transform: 'NONE' | 'UPPERCASE' | 'LOWERCASE' | 'TRIM';
}

// ─── Subscription ───────────────────────────────────────────

export type PlanId = 'free' | 'starter' | 'business';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired';

export interface Subscription {
  user_id: string;
  plan: PlanId;
  status: SubscriptionStatus;
  created_at: string;
  updated_at?: string;
}

export interface Plan {
  id: PlanId;
  name: string;
  nameAr: string;
  price: number;
  description: string;
  features: string[];
}

// ─── Logs & Events ──────────────────────────────────────────

export type MessageDirection = 'INBOUND' | 'OUTBOUND' | 'SENT';
export type MessageStatus = 'SUCCESS' | 'ERROR' | 'PENDING';

export interface MessageLog {
  id: string;
  user_id: string;
  connector_id: string | null;
  direction: MessageDirection;
  status: MessageStatus;
  payload?: string;
  error?: string;
  created_at: string;
}

export interface WebhookEvent {
  id: string;
  connector_id: string;
  user_id: string;
  method: string;
  headers: string; // JSON string
  body: string;
  source_ip: string;
  created_at: string;
}

// ─── Sync ───────────────────────────────────────────────────

export type SyncOperation = 'INSERT' | 'UPDATE' | 'DELETE';
export type SyncStatus = 'PENDING' | 'SYNCED' | 'FAILED';

export interface SyncQueueItem {
  id: string;
  user_id: string;
  table_name: string;
  row_id: string;
  operation: SyncOperation;
  data: string; // JSON string
  status: SyncStatus;
  created_at: string;
}

export interface SyncEvent {
  id?: string;
  table: string;
  rowId: string;
  operation: SyncOperation;
  data: Record<string, any>;
}

// ─── Pairing ────────────────────────────────────────────────

export interface PairingToken {
  id: string;
  user_id: string;
  code: string;
  gateway_url: string;
  user_name: string;
  user_email: string;
  is_used: boolean;
  expires_at: string;
  created_at: string;
}

// ─── API Response Types ─────────────────────────────────────

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ─── WebSocket Events ───────────────────────────────────────

export type WSEventType =
  | 'WEBHOOK_EVENT'
  | 'SYNC_REQUEST'
  | 'DEVICE_PAIRED'
  | 'DEVICE_UNPAIRED'
  | 'NOTIFICATION'
  | 'CONNECTED'
  | 'PONG';

export interface WSEvent {
  type: WSEventType;
  [key: string]: any;
}

// ─── Admin Stats ────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalMessages: number;
  totalWebhooks: number;
  totalConnectors: number;
  totalDevices: number;
}
