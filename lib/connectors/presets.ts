export interface ConnectorPreset {
  id: string;
  name: string;
  platformType: string;
  description: string;
  icon: string;
  protocol: 'REST' | 'WebSocket';
  endpointUrl: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  authType: 'NONE' | 'API_KEY' | 'BASIC' | 'BEARER' | 'OAUTH2';
  authHint?: string;
  headers?: Record<string, string>;
  samplePayload: string;
  docsUrl?: string;
}

export const CONNECTOR_PRESETS: ConnectorPreset[] = [
  {
    id: 'whatsapp',
    name: 'WhatsApp Business API',
    platformType: 'Messaging',
    description: 'إرسال واستقبال رسائل WhatsApp عبر API الأعمال',
    icon: 'message.fill',
    protocol: 'REST',
    endpointUrl: 'https://graph.facebook.com/v21.0/YOUR_PHONE_NUMBER_ID/messages',
    httpMethod: 'POST',
    authType: 'BEARER',
    authHint: 'أدخل System User Access Token من Facebook Developers',
    headers: { 'Content-Type': 'application/json' },
    samplePayload: JSON.stringify({
      messaging_product: 'whatsapp',
      to: '966XXXXXXXXX',
      type: 'text',
      text: { body: 'مرحباً من AlHudhud Connect!' },
    }, null, 2),
    docsUrl: 'https://developers.facebook.com/docs/whatsapp',
  },
  {
    id: 'telegram',
    name: 'Telegram Bot',
    platformType: 'Messaging',
    description: 'إرسال رسائل واستقبال أوامر من بوت Telegram',
    icon: 'paperplane.fill',
    protocol: 'REST',
    endpointUrl: 'https://api.telegram.org/botYOUR_BOT_TOKEN/sendMessage',
    httpMethod: 'POST',
    authType: 'NONE',
    authHint: 'ضع التوكن مباشرة في عنوان الرابط (botYOUR_TOKEN)',
    headers: { 'Content-Type': 'application/json' },
    samplePayload: JSON.stringify({
      chat_id: '@your_channel_or_chat_id',
      text: 'مرحباً من AlHudhud Connect!',
      parse_mode: 'Markdown',
    }, null, 2),
    docsUrl: 'https://core.telegram.org/bots/api',
  },
  {
    id: 'slack',
    name: 'Slack Webhook',
    platformType: 'Messaging',
    description: 'إرسال إشعارات إلى قنوات Slack',
    icon: 'bell.fill',
    protocol: 'REST',
    endpointUrl: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
    httpMethod: 'POST',
    authType: 'NONE',
    headers: { 'Content-Type': 'application/json' },
    samplePayload: JSON.stringify({
      text: '🔔 إشعار من AlHudhud Connect!',
      attachments: [{ title: 'تفاصيل', text: 'رسالة ترحيبية', color: '#E6A23C' }],
    }, null, 2),
    docsUrl: 'https://api.slack.com/messaging/webhooks',
  },
  {
    id: 'twilio-sms',
    name: 'Twilio SMS',
    platformType: 'Messaging',
    description: 'إرسال رسائل SMS عبر Twilio API',
    icon: 'envelope.fill',
    protocol: 'REST',
    endpointUrl: 'https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json',
    httpMethod: 'POST',
    authType: 'BASIC',
    authHint: 'Account SID هو username، Auth Token هو password',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    samplePayload: JSON.stringify({
      To: '+966XXXXXXXXX',
      From: '+1XXXXXXXXXX',
      Body: 'مرحباً من AlHudhud Connect!',
    }, null, 2),
    docsUrl: 'https://www.twilio.com/docs/sms',
  },
  {
    id: 'discord',
    name: 'Discord Webhook',
    platformType: 'Messaging',
    description: 'إرسال رسائل إلى قنوات Discord',
    icon: 'bubble.left.fill',
    protocol: 'REST',
    endpointUrl: 'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN',
    httpMethod: 'POST',
    authType: 'NONE',
    headers: { 'Content-Type': 'application/json' },
    samplePayload: JSON.stringify({
      content: '🔔 إشعار من AlHudhud Connect!',
      embeds: [{
        title: 'رسالة جديدة',
        description: 'مرحباً بالعالم',
        color: 15105570,
      }],
    }, null, 2),
    docsUrl: 'https://discord.com/developers/docs/resources/webhook',
  },
  {
    id: 'rest-basic',
    name: 'API عام (REST)',
    platformType: 'Custom',
    description: 'اتصال بأي REST API مخصص',
    icon: 'globe',
    protocol: 'REST',
    endpointUrl: 'https://api.example.com/endpoint',
    httpMethod: 'POST',
    authType: 'NONE',
    samplePayload: JSON.stringify({
      key: 'value',
      timestamp: new Date().toISOString(),
    }, null, 2),
  },
  {
    id: 'websocket-basic',
    name: 'WebSocket عام',
    platformType: 'Custom',
    description: 'اتصال مباشر بأي خادم WebSocket',
    icon: 'antenna.radiowaves.left.and.right',
    protocol: 'WebSocket',
    endpointUrl: 'wss://example.com/ws',
    httpMethod: 'POST',
    authType: 'NONE',
    samplePayload: JSON.stringify({
      type: 'message',
      payload: { text: 'Hello' },
    }, null, 2),
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets API',
    platformType: 'Productivity',
    description: 'قراءة وكتابة جداول Google Sheets',
    icon: 'tablecells.fill',
    protocol: 'REST',
    endpointUrl: 'https://sheets.googleapis.com/v4/spreadsheets/YOUR_SPREADSHEET_ID',
    httpMethod: 'GET',
    authType: 'OAUTH2',
    authHint: 'أنشئ Client ID و Secret من Google Cloud Console',
    headers: { 'Content-Type': 'application/json' },
    samplePayload: JSON.stringify({
      range: 'Sheet1!A1:B2',
      majorDimension: 'ROWS',
      values: [['Name', 'Email'], ['AlHudhud', 'hello@alhudhud.com']],
    }, null, 2),
    docsUrl: 'https://developers.google.com/sheets/api',
  },
  {
    id: 'github',
    name: 'GitHub API',
    platformType: 'Development',
    description: 'الوصول إلى GitHub repositories، issues، PRs',
    icon: 'chevron.left.forwardslash.chevron.right',
    protocol: 'REST',
    endpointUrl: 'https://api.github.com',
    httpMethod: 'GET',
    authType: 'BEARER',
    authHint: 'استخدم Personal Access Token أو GitHub App Token',
    headers: { 'Accept': 'application/vnd.github.v3+json' },
    samplePayload: JSON.stringify({
      title: 'New Issue',
      body: 'Description from AlHudhud Connect',
      labels: ['automation'],
    }, null, 2),
    docsUrl: 'https://docs.github.com/en/rest',
  },
  {
    id: 'notion',
    name: 'Notion API',
    platformType: 'Productivity',
    description: 'إدارة قواعد بيانات وصفحات Notion',
    icon: 'note.text',
    protocol: 'REST',
    endpointUrl: 'https://api.notion.com/v1/pages',
    httpMethod: 'POST',
    authType: 'BEARER',
    authHint: 'أدخل Integration Token من Notion Developers',
    headers: { 'Content-Type': 'application/json', 'Notion-Version': '2022-06-28' },
    samplePayload: JSON.stringify({
      parent: { database_id: 'YOUR_DATABASE_ID' },
      properties: {
        Name: { title: [{ text: { content: 'من AlHudhud Connect' } }] },
        Status: { select: { name: 'New' } },
      },
    }, null, 2),
    docsUrl: 'https://developers.notion.com',
  },
];

export function getPresetById(id: string): ConnectorPreset | undefined {
  return CONNECTOR_PRESETS.find(p => p.id === id);
}

export function getPresetsByProtocol(protocol: string): ConnectorPreset[] {
  return CONNECTOR_PRESETS.filter(p => p.protocol === protocol);
}
