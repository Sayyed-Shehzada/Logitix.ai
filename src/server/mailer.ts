import nodemailer from 'nodemailer';

function getCleanSenderEmail(): string {
  return (process.env.SMTP_USER || 'logitix.ai@gmail.com').trim().replace(/['"]+/g, '');
}

export function isSmtpConfigured(): boolean {
  const pass = process.env.SMTP_PASS?.trim().replace(/['"]+/g, '');
  return Boolean(pass && pass.length > 0);
}

function getMailTransporter() {
  const pass = process.env.SMTP_PASS?.trim().replace(/['"]+/g, '');
  if (!pass) {
    return null;
  }

  const senderEmail = getCleanSenderEmail();

  return nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: senderEmail,
      pass: pass.replace(/\s+/g, ''), // Strip spaces from app password if copied as "xxxx xxxx xxxx xxxx"
    },
  });
}

function formatSmtpError(err: any): string {
  const msg = err?.message || String(err);
  if (msg.includes('535') || msg.includes('Username and Password not accepted') || msg.includes('Invalid login')) {
    return 'Gmail authentication rejected (535-5.7.8): Google requires a 16-character App Password (from myaccount.google.com/apppasswords). Standard Gmail passwords are not accepted.';
  }
  return msg;
}

/**
 * Dispatches verification code email to user inbox
 */
export async function sendVerificationCodeEmail(to: string, code: string, recipientName?: string): Promise<{ success: boolean; delivered: boolean; error?: string }> {
  const name = recipientName || 'LOGITIX Member';
  const transporter = getMailTransporter();
  const senderEmail = getCleanSenderEmail();
  const senderName = 'LOGITIX AI';

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LOGITIX AI Verification Code</title>
  </head>
  <body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc;">
    <div style="max-width: 520px; margin: 0 auto; background: #1e293b; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; padding: 8px 16px; background: linear-gradient(135deg, #4f46e5, #06b6d4); border-radius: 12px; font-weight: 800; font-size: 16px; letter-spacing: 2px; color: #ffffff;">
          LOGITIX AI
        </div>
      </div>

      <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #ffffff; text-align: center;">
        Your Account Security Code
      </h2>
      <p style="margin: 0 0 24px 0; font-size: 14px; color: #94a3b8; line-height: 1.6; text-align: center;">
        Hello <strong>${name}</strong>, use the one-time 6-digit code below to confirm your email and log in to your LOGITIX AI workspace:
      </p>

      <div style="background: #0f172a; border: 1px solid rgba(99, 102, 241, 0.4); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
        <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #38bdf8;">
          ${code}
        </span>
      </div>

      <p style="margin: 0 0 16px 0; font-size: 13px; color: #64748b; line-height: 1.5; text-align: center;">
        This code is valid for 15 minutes. Never share this code with anyone.
      </p>

      <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; text-align: center; font-size: 11px; color: #475569;">
        Sent automatically by LOGITIX AI from <strong>${senderEmail}</strong>.<br />
        If you did not request this login, you can safely ignore this email.
      </div>
    </div>
  </body>
  </html>
  `;

  const textContent = `LOGITIX AI Verification Code\n\nHello ${name},\n\nYour 6-Digit Security Confirmation Code is:\n\n${code}\n\nThis code will expire in 15 minutes.\n\nSent from ${senderEmail}\nLOGITIX AI Security Team`;

  if (!transporter) {
    console.warn(`[Mailer] SMTP_PASS not set. Cannot dispatch email via ${senderEmail} to ${to}. Code fallback active.`);
    return {
      success: true,
      delivered: false,
      error: 'SMTP_PASS not configured yet. 16-character Google App Password for logitix.ai@gmail.com is required to dispatch real email.',
    };
  }

  try {
    const info = await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to,
      subject: `[LOGITIX AI] Confirmation Code: ${code}`,
      text: textContent,
      html: htmlContent,
    });
    console.log(`[Mailer] Verification email successfully delivered to ${to} from ${senderEmail}! MessageId: ${info.messageId}`);
    return { success: true, delivered: true };
  } catch (err: any) {
    const friendlyError = formatSmtpError(err);
    console.warn(`[Mailer] Notice: Email dispatch via ${senderEmail} did not complete:`, friendlyError);
    return {
      success: false,
      delivered: false,
      error: friendlyError,
    };
  }
}

/**
 * Dispatches password reset code email to user inbox
 */
export async function sendPasswordResetCodeEmail(to: string, code: string): Promise<{ success: boolean; delivered: boolean; error?: string }> {
  const transporter = getMailTransporter();
  const senderEmail = getCleanSenderEmail();
  const senderName = 'LOGITIX AI';

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LOGITIX AI Password Reset</title>
  </head>
  <body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc;">
    <div style="max-width: 520px; margin: 0 auto; background: #1e293b; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; padding: 8px 16px; background: linear-gradient(135deg, #f59e0b, #4f46e5); border-radius: 12px; font-weight: 800; font-size: 16px; letter-spacing: 2px; color: #ffffff;">
          LOGITIX AI
        </div>
      </div>

      <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #ffffff; text-align: center;">
        Reset Your Master Password
      </h2>
      <p style="margin: 0 0 24px 0; font-size: 14px; color: #94a3b8; line-height: 1.6; text-align: center;">
        We received a request to reset the password for your LOGITIX AI account (<span style="color: #60a5fa;">${to}</span>). Enter this 6-digit verification code to proceed:
      </p>

      <div style="background: #0f172a; border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
        <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #fbbf24;">
          ${code}
        </span>
      </div>

      <p style="margin: 0 0 16px 0; font-size: 13px; color: #64748b; line-height: 1.5; text-align: center;">
        This verification code expires in 15 minutes.
      </p>

      <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; text-align: center; font-size: 11px; color: #475569;">
        Dispatched by LOGITIX AI Security from <strong>${senderEmail}</strong>.<br />
        If you did not request this password reset, your account is secure and you can disregard this email.
      </div>
    </div>
  </body>
  </html>
  `;

  const textContent = `LOGITIX AI Password Reset\n\nYou requested a password reset for your LOGITIX AI account (${to}).\n\nYour 6-Digit Password Reset Verification Code is:\n\n${code}\n\nThis verification code will expire in 15 minutes.\n\nSent from ${senderEmail}\nLOGITIX AI Security Team`;

  if (!transporter) {
    console.warn(`[Mailer] SMTP_PASS not set. Cannot dispatch reset email via ${senderEmail} to ${to}. Code fallback active.`);
    return {
      success: true,
      delivered: false,
      error: 'SMTP_PASS not configured yet. 16-character Google App Password for logitix.ai@gmail.com is required to dispatch real email.',
    };
  }

  try {
    const info = await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to,
      subject: `[LOGITIX AI] Password Reset Verification Code: ${code}`,
      text: textContent,
      html: htmlContent,
    });
    console.log(`[Mailer] Password reset email successfully delivered to ${to} from ${senderEmail}! MessageId: ${info.messageId}`);
    return { success: true, delivered: true };
  } catch (err: any) {
    const friendlyError = formatSmtpError(err);
    console.warn(`[Mailer] Notice: Reset email dispatch via ${senderEmail} did not complete:`, friendlyError);
    return {
      success: false,
      delivered: false,
      error: friendlyError,
    };
  }
}
