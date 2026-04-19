const nodemailer = require('nodemailer');
const config = require('../config/config');
const logger = require('../utils/logger');

let transporter;

const getTransporter = () => {
  if (!transporter) {
    if (config.env === 'development' && !config.smtp.host) {
      // Use Ethereal (catch-all test account) in dev if no SMTP configured
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: { user: 'dev@ethereal.email', pass: 'devpassword' },
      });
      logger.warn('Using Ethereal test email transport. Configure SMTP_* env vars for real delivery.');
    } else {
      transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: { user: config.smtp.user, pass: config.smtp.pass },
      });
    }
  }
  return transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await getTransporter().sendMail({
      from: config.smtp.from,
      to,
      subject,
      html,
      text,
    });
    logger.info('Email sent', { messageId: info.messageId, to });
    return info;
  } catch (err) {
    logger.error('Email send failure', { error: err.message, to });
    throw err;
  }
};

const sendOtpEmail = async (email, otp, name = 'User') => {
  const expiryMinutes = config.otp.expiresMinutes;
  await sendEmail({
    to: email,
    subject: 'Your Privora Login Code',
    html: `
      <!DOCTYPE html>
      <html lang="en" dir="ltr">
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="font-family:Arial,sans-serif;background:#f4f6f9;margin:0;padding:20px">
        <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,.1)">
          <div style="text-align:center;margin-bottom:32px">
            <h1 style="color:#1a56db;font-size:28px;margin:0">Privora</h1>
            <p style="color:#6b7280;font-size:13px;margin:4px 0 0">Consent Management Platform</p>
          </div>
          <p style="color:#374151;font-size:15px">Hello ${name},</p>
          <p style="color:#374151;font-size:15px">Your one-time login code is:</p>
          <div style="background:#f0f4ff;border:2px solid #1a56db;border-radius:8px;text-align:center;padding:20px;margin:24px 0">
            <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#1a56db">${otp}</span>
          </div>
          <p style="color:#6b7280;font-size:14px">This code expires in <strong>${expiryMinutes} minutes</strong>.</p>
          <p style="color:#6b7280;font-size:14px">If you did not request this code, please ignore this email.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0">
          <p style="color:#9ca3af;font-size:12px;text-align:center">
            Privora — Saudi PDPL Compliant Consent Management<br>
            This is an automated message. Do not reply.
          </p>
        </div>
      </body>
      </html>
    `,
    text: `Your Privora login code is: ${otp}\n\nExpires in ${expiryMinutes} minutes.\n\nIf you did not request this, ignore this email.`,
  });
};

module.exports = { sendEmail, sendOtpEmail };
