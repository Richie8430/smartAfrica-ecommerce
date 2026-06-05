import nodemailer from 'nodemailer';
import { logger, maskPII } from '../utils/logger.js';

// ─── Config ───────────────────────────────────────────────────────────────────

const SMTP_PORT = Number(process.env['SMTP_PORT'] ?? 587);

const transporter = nodemailer.createTransport({
  host:   process.env['SMTP_HOST'] ?? 'smtp.mailtrap.io',
  port:   SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: process.env['SMTP_USER'] ?? '',
    pass: process.env['SMTP_PASS'] ?? '',
  },
});

// Verify SMTP connection once at startup — log result, never throw
transporter.verify().then(() => {
  logger.info('SMTP connection verified');
}).catch((err: unknown) => {
  logger.error('SMTP connection failed', { err });
});

// ─── Base send ────────────────────────────────────────────────────────────────

async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<void> {
  const from = `SmartTrade Africa <${process.env['EMAIL_FROM'] ?? 'noreply@smarttrade.test'}>`;
  try {
    await transporter.sendMail({ from, ...opts });
    logger.info(`Email sent to ${maskPII(opts.to)} — "${opts.subject}"`);
  } catch (err) {
    logger.error(`Email failed to ${maskPII(opts.to)} — "${opts.subject}"`, { err });
    throw err;
  }
}

// ─── Base layout ──────────────────────────────────────────────────────────────

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0"
             style="background:#fff;border-radius:8px;overflow:hidden;
                    box-shadow:0 2px 8px rgba(0,0,0,0.08);max-width:600px;">
        <!-- Header -->
        <tr>
          <td style="background:#0f172a;padding:24px 40px;">
            <span style="color:#38bdf8;font-size:22px;font-weight:700;letter-spacing:1px;">
              SmartTrade Africa
            </span>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:36px 40px;color:#374151;">${content}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;
                     padding:18px 40px;font-size:12px;color:#9ca3af;">
            SmartTrade Africa · Questions? Contact
            <a href="mailto:support@smarttrade.africa" style="color:#38bdf8;">
              support@smarttrade.africa</a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── OTP email ────────────────────────────────────────────────────────────────

export async function sendOTPEmail(to: string, otp: string): Promise<void> {
  const html = layout(`
    <h2 style="margin:0 0 16px;color:#0f172a;font-size:22px;">Verify your email address</h2>
    <p style="margin:0 0 24px;line-height:1.6;color:#4b5563;">
      Use the code below to verify your SmartTrade Africa account.
      Do not share this code with anyone.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <span style="display:inline-block;background:#f1f5f9;border-radius:10px;
                   padding:18px 48px;font-size:40px;font-weight:700;
                   letter-spacing:10px;color:#0f172a;border:2px dashed #cbd5e1;">
        ${otp}
      </span>
    </div>
    <p style="text-align:center;margin:0;font-size:13px;color:#6b7280;">
      This code expires in <strong>15 minutes</strong>.
    </p>
    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">
      If you did not create a SmartTrade Africa account, you can safely ignore this email.
    </p>
  `);
  await sendEmail({ to, subject: 'Verify your SmartTrade Africa account', html });
}

// ─── Password reset email ─────────────────────────────────────────────────────

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const html = layout(`
    <h2 style="margin:0 0 16px;color:#0f172a;font-size:22px;">Reset your password</h2>
    <p style="margin:0 0 24px;line-height:1.6;color:#4b5563;">
      We received a request to reset your SmartTrade Africa password.
      Click the button below to choose a new one.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${resetUrl}"
         style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;
                padding:14px 36px;border-radius:6px;font-size:15px;font-weight:600;">
        Reset Password
      </a>
    </div>
    <p style="text-align:center;margin:0;font-size:13px;color:#6b7280;">
      This link expires in <strong>1 hour</strong>.
    </p>
    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">
      If you did not request a password reset, you can safely ignore this email.
      Your password will remain unchanged.
    </p>
  `);
  await sendEmail({ to, subject: 'Reset your SmartTrade Africa password', html });
}

// ─── New device alert email ───────────────────────────────────────────────────

export async function sendNewDeviceAlert(
  to: string,
  data: { ip: string; userAgent: string; timestamp: string },
): Promise<void> {
  const appUrl = process.env['APP_URL'] ?? 'http://localhost:5173';
  const html = layout(`
    <h2 style="margin:0 0 16px;color:#dc2626;font-size:22px;">New login detected</h2>
    <p style="margin:0 0 20px;line-height:1.6;color:#4b5563;">
      We noticed a sign-in to your SmartTrade Africa account from a new device or location.
    </p>
    <table role="presentation" width="100%"
           style="background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;
                  margin:0 0 24px;font-size:14px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 8px;color:#374151;">
          <strong>IP Address:</strong>&nbsp;${data.ip}
        </p>
        <p style="margin:0 0 8px;color:#374151;">
          <strong>Device / Browser:</strong>&nbsp;${data.userAgent}
        </p>
        <p style="margin:0;color:#374151;">
          <strong>Time:</strong>&nbsp;${data.timestamp}
        </p>
      </td></tr>
    </table>
    <p style="margin:0 0 24px;line-height:1.6;color:#4b5563;">
      If this was you, no action is needed. If you do not recognise this activity,
      revoke access immediately from your security settings.
    </p>
    <div style="text-align:center;">
      <a href="${appUrl}/account/security"
         style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;
                padding:12px 28px;border-radius:6px;font-size:14px;font-weight:600;">
        Review Security Settings
      </a>
    </div>
  `);
  await sendEmail({ to, subject: 'New login detected on your SmartTrade account', html });
}

// ─── Shared order types (avoids importing Prisma Decimal) ─────────────────────

export interface OrderEmailItem {
  name:       string;
  quantity:   number;
  unit_price: number;
  subtotal:   number;
}

export interface OrderEmailData {
  order_id:         string;
  total_amount:     number;
  shipping_address: {
    street:     string;
    city:       string;
    state:      string;
    country:    string;
    postalCode?: string;
  };
  order_items: OrderEmailItem[];
}

export interface PaymentEmailData {
  tx_ref:     string;
  amount:     number;
  currency:   string;
  created_at: string;
}

// ─── Order confirmation email ─────────────────────────────────────────────────

export async function sendOrderConfirmation(to: string, order: OrderEmailData): Promise<void> {
  const shortId = order.order_id.slice(0, 8).toUpperCase();
  const addr    = order.shipping_address;

  const itemRows = order.order_items.map((i) => `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;color:#374151;">${i.name}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:center;color:#374151;">${i.quantity}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:right;color:#374151;">$${i.unit_price.toFixed(2)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:right;color:#374151;">$${i.subtotal.toFixed(2)}</td>
    </tr>
  `).join('');

  const html = layout(`
    <h2 style="margin:0 0 8px;color:#0f172a;font-size:22px;">Order Confirmed!</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">Reference: <strong>#${shortId}</strong></p>

    <table role="presentation" width="100%" style="border-collapse:collapse;margin:0 0 24px;">
      <thead>
        <tr style="background:#f8fafc;">
          <th style="padding:10px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;">Item</th>
          <th style="padding:10px;text-align:center;font-size:12px;color:#6b7280;text-transform:uppercase;">Qty</th>
          <th style="padding:10px;text-align:right;font-size:12px;color:#6b7280;text-transform:uppercase;">Unit Price</th>
          <th style="padding:10px;text-align:right;font-size:12px;color:#6b7280;text-transform:uppercase;">Subtotal</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
      <tfoot>
        <tr>
          <td colspan="3"
              style="padding:12px 10px;text-align:right;font-weight:600;font-size:15px;color:#0f172a;">
            Total
          </td>
          <td style="padding:12px 10px;text-align:right;font-weight:700;font-size:18px;color:#0f172a;">
            $${order.total_amount.toFixed(2)}
          </td>
        </tr>
      </tfoot>
    </table>

    <h3 style="margin:0 0 8px;color:#0f172a;font-size:15px;">Shipping Address</h3>
    <p style="margin:0 0 24px;line-height:1.7;color:#4b5563;font-size:14px;">
      ${addr.street}<br>
      ${addr.city}, ${addr.state}<br>
      ${addr.country}${addr.postalCode ? ' ' + addr.postalCode : ''}
    </p>

    <p style="margin:0;font-size:13px;color:#6b7280;">
      Estimated delivery: <strong>3–5 business days</strong>
    </p>
  `);

  await sendEmail({ to, subject: `Order Confirmed – #${shortId}`, html });
}

// ─── Payment receipt email ────────────────────────────────────────────────────

export async function sendPaymentReceipt(
  to:   string,
  data: { order: OrderEmailData; payment: PaymentEmailData },
): Promise<void> {
  const { order, payment } = data;
  const shortId  = order.order_id.slice(0, 8).toUpperCase();
  const paidDate = new Date(payment.created_at).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const itemRows = order.order_items.map((i) => `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;color:#374151;">${i.name}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:center;color:#374151;">${i.quantity}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:right;color:#374151;">$${i.subtotal.toFixed(2)}</td>
    </tr>
  `).join('');

  const html = layout(`
    <h2 style="margin:0 0 8px;color:#0f172a;font-size:22px;">Payment Receipt</h2>
    <p style="margin:0 0 24px;color:#4b5563;line-height:1.6;">
      Your payment for order <strong>#${shortId}</strong> was received successfully.
      Please keep this email as your receipt.
    </p>

    <table role="presentation" width="100%"
           style="background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;
                  margin:0 0 24px;font-size:14px;">
      <tr><td style="padding:16px;line-height:1.8;">
        <p style="margin:0;color:#374151;">
          <strong>Transaction Ref:</strong>&nbsp;${payment.tx_ref}
        </p>
        <p style="margin:0;color:#374151;">
          <strong>Amount:</strong>&nbsp;${payment.currency} $${payment.amount.toFixed(2)}
        </p>
        <p style="margin:0;color:#374151;">
          <strong>Date:</strong>&nbsp;${paidDate}
        </p>
      </td></tr>
    </table>

    <table role="presentation" width="100%" style="border-collapse:collapse;margin:0 0 24px;">
      <thead>
        <tr style="background:#f8fafc;">
          <th style="padding:10px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;">Item</th>
          <th style="padding:10px;text-align:center;font-size:12px;color:#6b7280;text-transform:uppercase;">Qty</th>
          <th style="padding:10px;text-align:right;font-size:12px;color:#6b7280;text-transform:uppercase;">Subtotal</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
      <tfoot>
        <tr>
          <td colspan="2"
              style="padding:12px 10px;text-align:right;font-weight:600;font-size:15px;color:#0f172a;">
            Total Paid
          </td>
          <td style="padding:12px 10px;text-align:right;font-weight:700;font-size:18px;color:#0f172a;">
            $${order.total_amount.toFixed(2)}
          </td>
        </tr>
      </tfoot>
    </table>

    <p style="margin:0;font-size:12px;color:#9ca3af;">
      If you have any questions about this payment, contact
      <a href="mailto:support@smarttrade.africa" style="color:#38bdf8;">support@smarttrade.africa</a>.
    </p>
  `);

  await sendEmail({ to, subject: 'Payment Receipt – SmartTrade Africa', html });
}

// ─── Order status update email ────────────────────────────────────────────────

export async function sendOrderStatusUpdate(
  to:   string,
  data: { orderId: string; status: string; estimatedDelivery?: string },
): Promise<void> {
  const shortId  = data.orderId.slice(0, 8).toUpperCase();
  const appUrl   = process.env['APP_URL'] ?? 'http://localhost:5173';

  const statusLabels: Record<string, string> = {
    CONFIRMED: 'confirmed',
    SHIPPED:   'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
  };

  const statusMessages: Record<string, string> = {
    CONFIRMED: 'Great news! Your order has been confirmed and is being prepared.',
    SHIPPED:   'Your order is on its way! Track your package with the details below.',
    DELIVERED: 'Your order has been delivered. We hope you enjoy your purchase!',
    CANCELLED: 'Your order has been cancelled. If this was a mistake, please contact us.',
  };

  const label   = statusLabels[data.status]  ?? data.status.toLowerCase();
  const message = statusMessages[data.status] ?? `Your order status has been updated to ${label}.`;

  const deliveryNote = data.estimatedDelivery
    ? `<p style="margin:0 0 24px;color:#4b5563;font-size:14px;">
         Estimated delivery: <strong>${data.estimatedDelivery}</strong>
       </p>`
    : '';

  const html = layout(`
    <h2 style="margin:0 0 8px;color:#0f172a;font-size:22px;">
      Your order has been ${label}
    </h2>
    <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">
      Reference: <strong>#${shortId}</strong>
    </p>
    <p style="margin:0 0 24px;line-height:1.6;color:#4b5563;">${message}</p>
    ${deliveryNote}
    <div style="text-align:center;margin:0 0 24px;">
      <a href="${appUrl}/orders/${data.orderId}"
         style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;
                padding:12px 28px;border-radius:6px;font-size:14px;font-weight:600;">
        View Order
      </a>
    </div>
  `);

  await sendEmail({ to, subject: `Your order has been ${label}`, html });
}
