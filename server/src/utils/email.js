const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async (to, subject, htmlContent) => {
  const msg = {
    to,
    from: process.env.EMAIL_FROM,
    subject: `Finance Tracker — ${subject}`,
    html: htmlContent,
  };

  try {
    await sgMail.send(msg);
    console.log(`[EMAIL] Sent "${subject}" to ${to}`);
  } catch (err) {
    console.error(`[EMAIL] Failed to send "${subject}" to ${to}:`, err.message);
  }
};

module.exports = { sendEmail };
