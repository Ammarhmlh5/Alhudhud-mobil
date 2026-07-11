import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || 'AlHudhud Connect <noreply@alhudhud.com>';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  if (!SMTP_HOST) {
    console.log('  ⚠️  SMTP not configured. API key emails will be logged to console.');
    return null as any;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return transporter;
}

export async function sendApiKeyEmail(email: string, apiKey: string): Promise<boolean> {
  const subject = 'مفتاح API الخاص بك - AlHudhud Connect';
  const html = `
    <!DOCTYPE html>
    <html dir="rtl">
    <head><meta charset="UTF-8"></head>
    <body style="font-family: 'Segoe UI', Tahoma, sans-serif; background: #f5f5f5; padding: 20px;">
      <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="background: #1e293b; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">AlHudhud Connect</h1>
          <p style="color: #94a3b8; margin: 8px 0 0; font-size: 13px;">مفتاح API الخاص بك</p>
        </div>
        <div style="padding: 24px;">
          <p style="color: #334155; line-height: 1.8;">مرحباً،</p>
          <p style="color: #334155; line-height: 1.8;">إليك مفتاح API الخاص بجهازك. استخدمه في بروتوكولات الاتصال:</p>
          <div style="background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center; direction: ltr;">
            <code style="font-size: 14px; color: #1e293b; font-weight: bold; word-break: break-all;">${apiKey}</code>
          </div>
          <p style="color: #64748b; font-size: 12px; line-height: 1.8;">
            هذا المفتاح سري ولا يُشارك مع أي شخص.<br>
            إذا لم تطلب هذا المفتاح، تجاهل هذه الرسالة.
          </p>
        </div>
        <div style="background: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 11px; margin: 0;">AlHudhud Connect © 2024</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const transport = getTransporter();
  if (!transport) {
    console.log(`\n  📧 API Key for ${email}: ${apiKey}\n`);
    return true;
  }

  try {
    await transport.sendMail({ from: SMTP_FROM, to: email, subject, html });
    return true;
  } catch (error: any) {
    console.error('  ❌ Failed to send API key email:', error.message);
    return false;
  }
}
