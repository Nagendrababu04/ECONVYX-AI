// ECONVYX AI — Email Service
// Sends transactional emails using Nodemailer (SMTP).
// Configure via environment variables — works with Gmail, Outlook, or any SMTP provider.

import nodemailer from 'nodemailer';

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('[Email] SMTP not configured — emails will NOT be sent. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env');
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465 (SSL), false for 587 (STARTTLS)
    auth: { user, pass },
    tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' },
  });
}

const FROM_NAME = process.env.EMAIL_FROM_NAME || 'ECONVYX AI';
const FROM_EMAIL = process.env.SMTP_USER || 'noreply@econvyx.ai';

export async function sendPasswordResetEmail(toEmail: string, resetUrl: string): Promise<boolean> {
  if (process.env.NODE_ENV === 'test') return true; // skip in tests

  const transporter = createTransporter();
  if (!transporter) return false;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1a56db,#0ea5e9);padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">ECONVYX AI</h1>
          <p style="margin:6px 0 0;color:#bfdbfe;font-size:14px;">Financial Intelligence Platform</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 16px;color:#1e293b;font-size:20px;">Reset Your Password</h2>
          <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
            We received a request to reset the password for your ECONVYX AI account associated with <strong>${toEmail}</strong>.
          </p>
          <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
            Click the button below to set a new password. This link is valid for <strong>1 hour</strong>.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
            <tr><td style="background:#1a56db;border-radius:8px;text-align:center;">
              <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;">
                Reset Password →
              </a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;color:#94a3b8;font-size:13px;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p style="margin:0 0 32px;word-break:break-all;">
            <a href="${resetUrl}" style="color:#1a56db;font-size:13px;">${resetUrl}</a>
          </p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;">
          <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;">
            If you didn't request a password reset, you can safely ignore this email — your password will not change.<br>
            For security, this link expires in 1 hour.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#94a3b8;font-size:12px;">© ${new Date().getFullYear()} ECONVYX AI. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: toEmail,
      subject: 'Reset Your ECONVYX AI Password',
      text: `Reset your ECONVYX AI password by visiting: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
      html,
    });
    console.log(`[Email] Password reset email sent to ${toEmail}`);
    return true;
  } catch (err: any) {
    console.error('[Email] Failed to send password reset email:', err.message);
    return false;
  }
}

export async function sendWelcomeEmail(toEmail: string, fullName: string): Promise<boolean> {
  if (process.env.NODE_ENV === 'test') return true;

  const transporter = createTransporter();
  if (!transporter) return false;

  const appUrl = process.env.CLIENT_URL || 'http://localhost:5000';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#1a56db,#0ea5e9);padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">ECONVYX AI</h1>
          <p style="margin:6px 0 0;color:#bfdbfe;font-size:14px;">Financial Intelligence Platform</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 16px;color:#1e293b;font-size:20px;">Welcome, ${fullName}! 🎉</h2>
          <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
            Your ECONVYX AI account is ready. You now have access to AI-powered financial management — invoicing, reconciliation, cash flow forecasting, and more.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
            <tr><td style="background:#1a56db;border-radius:8px;text-align:center;">
              <a href="${appUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;">
                Go to Dashboard →
              </a>
            </td></tr>
          </table>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;">
          <p style="margin:0;color:#94a3b8;font-size:13px;">© ${new Date().getFullYear()} ECONVYX AI. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: toEmail,
      subject: 'Welcome to ECONVYX AI 🚀',
      text: `Welcome to ECONVYX AI, ${fullName}! Visit ${appUrl} to get started.`,
      html,
    });
    console.log(`[Email] Welcome email sent to ${toEmail}`);
    return true;
  } catch (err: any) {
    console.error('[Email] Failed to send welcome email:', err.message);
    return false;
  }
}
