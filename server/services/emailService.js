const nodemailer = require('nodemailer');

function getTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP_USER and SMTP_PASS must be set to send emails');
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendPasswordResetEmail({ to, resetUrl }) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"PatternOS" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Reset your PatternOS password',
    text: `You requested a password reset.\n\nClick the link below to set a new password (expires in 1 hour):\n\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; background: #080E1C; color: #C9C9C9; padding: 40px 32px; border-radius: 16px; border: 1px solid #1E2A3A;">
        <div style="text-align: center; margin-bottom: 32px;">
          <span style="color: #8B0000; font-size: 1.5rem;">◎</span>
          <span style="font-family: Georgia, serif; font-weight: 700; font-size: 1rem; color: #C9C9C9; letter-spacing: 0.15em; text-transform: uppercase; margin-left: 8px;">PatternOS</span>
        </div>
        <h2 style="font-size: 1.1rem; font-weight: 600; color: #E5E5E5; margin: 0 0 12px;">Reset your password</h2>
        <p style="font-size: 0.875rem; color: #8A8AA0; line-height: 1.6; margin: 0 0 24px;">
          We received a request to reset your password. Click the button below to choose a new one. This link expires in <strong style="color: #C9C9C9;">1 hour</strong>.
        </p>
        <a href="${resetUrl}" style="display: block; text-align: center; background: linear-gradient(135deg, #8B0000, #B22222); color: #D4D4D8; text-decoration: none; padding: 14px 24px; border-radius: 12px; font-weight: 700; font-size: 0.875rem; margin-bottom: 24px;">
          Reset Password
        </a>
        <p style="font-size: 0.75rem; color: #4A4A68; text-align: center; margin: 0;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

module.exports = { sendPasswordResetEmail };
