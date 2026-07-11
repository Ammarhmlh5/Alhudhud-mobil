export type ProtocolType = 'REST' | 'Webhook' | 'WebSocket' | 'GraphQL' | 'MQTT';

export type AuthType = 'NONE' | 'API_KEY' | 'BASIC' | 'BEARER' | 'OAUTH2';

export type ConnectorStatus = 'UNKNOWN' | 'ONLINE' | 'OFFLINE' | 'ERROR';

export type LogDirection = 'SENT' | 'RECEIVED';

export type LogStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface AuthConfig {
  type: AuthType;
  apiKey?: string;
  apiKeyHeader?: string;
  username?: string;
  password?: string;
  token?: string;
  tokenUrl?: string;
  clientId?: string;
  clientSecret?: string;
  scope?: string;
}

export interface DataMapping {
  inputFields?: Record<string, string>;
  outputFields?: Record<string, string>;
  transformScript?: string;
}

export interface ConnectorConfig {
  id: string;
  name: string;
  platformType: string;
  protocol: ProtocolType;
  endpointUrl: string;
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  auth: AuthConfig;
  dataMapping?: { rules: MappingRule[] } | null;
  scheduleInterval?: number | null;
  lastSyncedAt?: string | null;
  isActive: boolean;
  status: ConnectorStatus;
  lastConnectedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MappingRule {
  sourceField: string;
  targetField: string;
  transform?: 'none' | 'uppercase' | 'lowercase' | 'to_string' | 'to_number' | 'timestamp' | 'concat';
  defaultValue?: string;
  concatFields?: string[];
}

export interface ConnectorFormData {
  name: string;
  platformType: string;
  protocol: ProtocolType;
  endpointUrl: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  authType: AuthType;
  apiKey?: string;
  apiKeyHeader?: string;
  username?: string;
  password?: string;
  token?: string;
  tokenUrl?: string;
  clientId?: string;
  clientSecret?: string;
  scope?: string;
  headers?: string;
  dataMapping?: string;
  scheduleInterval?: number;
}

export interface MessageLog {
  id: string;
  connectorId: string | null;
  direction: LogDirection;
  status: LogStatus;
  payload: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface ConnectorStats {
  total: number;
  online: number;
  offline: number;
  totalMessages: number;
  successMessages: number;
  failedMessages: number;
}
