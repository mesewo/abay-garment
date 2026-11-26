import nodemailer from "nodemailer";

let transporter;

const isConfigured = () =>
  Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
};

/**
 * Sends an email. When email credentials are not configured we only log
 * in development; production fails loudly instead of silently dropping mail.
 */
export const sendMail = async ({ to, subject, html }) => {
  if (!isConfigured()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Email service is not configured");
    }
    console.warn(`[mailer] EMAIL_USER/EMAIL_PASS missing. Email to ${to}: ${subject}`);
    console.warn(`[mailer] Development preview:\n${html}`);
    return { accepted: [] };
  }

  return getTransporter().sendMail({
    to,
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    subject,
    html,
  });
};

export const sendOtpEmail = (to, otp) =>
  sendMail({
    to,
    subject: "Verify your Abay Garment account",
    html: `<p>Your verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${otp}</p><p>This code expires in 10 minutes.</p>`,
  });

export default { sendMail, sendOtpEmail };