const sgMail = require('@sendgrid/mail');

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

function generateEmailTemplate({
  title,
  greeting = 'Hi,',
  intro = '',
  content = '',
  highlightTitle = '',
  highlightContent = '',
  footerText = 'You are receiving this email because you are registered with Finance Tracker.',
}) {
  return `
    <div style="margin:0;padding:24px 0;background-color:#f6f8fa;">
      <div style="max-width:600px;margin:0 auto;padding:0 16px;">
        <div style="background-color:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <div style="padding:24px 32px;border-bottom:1px solid #e5e7eb;">
            <div style="font-family:Arial,sans-serif;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#64748b;">Finance Tracker</div>
            <div style="font-family:Arial,sans-serif;font-size:28px;line-height:36px;font-weight:700;color:#111827;margin-top:8px;">${title}</div>
          </div>
          <div style="padding:32px;">
            <div style="font-family:Arial,sans-serif;font-size:15px;line-height:24px;color:#111827;margin-bottom:16px;">${greeting}</div>
            ${intro ? `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:24px;color:#334155;margin-bottom:20px;">${intro}</div>` : ''}
            ${content ? `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:24px;color:#334155;">${content}</div>` : ''}
            ${highlightTitle || highlightContent ? `
              <div style="margin-top:24px;padding:20px;background-color:#f1f5f9;border-radius:10px;">
                ${highlightTitle ? `<div style="font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#0f172a;margin-bottom:8px;">${highlightTitle}</div>` : ''}
                ${highlightContent ? `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:22px;color:#334155;">${highlightContent}</div>` : ''}
              </div>
            ` : ''}
          </div>
        </div>
        <div style="font-family:Arial,sans-serif;font-size:12px;line-height:18px;color:#64748b;text-align:center;padding:16px 24px 0;">
          ${footerText}
        </div>
      </div>
    </div>
  `;
}

function getFromAddress() {
  const from = process.env.EMAIL_FROM;
  if (!from) {
    throw new Error('EMAIL_FROM is not configured');
  }

  return from.includes('<') ? from : `Finance Tracker <${from}>`;
}

function normalizeSubject(subject) {
  return subject.startsWith('Finance Tracker:') ? subject : `Finance Tracker: ${subject}`;
}

const sendEmail = async (to, subject, htmlOrTemplate) => {
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY is not configured');
  }

  const html = typeof htmlOrTemplate === 'string'
    ? htmlOrTemplate
    : generateEmailTemplate(htmlOrTemplate);

  const msg = {
    to,
    from: getFromAddress(),
    subject: normalizeSubject(subject),
    html,
  };

  try {
    await sgMail.send(msg);
    console.log(`[EMAIL] Sent "${msg.subject}" to ${to}`);
  } catch (err) {
    console.error(`[EMAIL] Failed to send "${msg.subject}" to ${to}:`, err.message);
    throw err;
  }
};

module.exports = { generateEmailTemplate, sendEmail };
