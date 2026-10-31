import nodemailer from "nodemailer";
import { convert } from "html-to-text";

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const renderTemplate = (template, data) => {
  const firstName = escapeHtml(data.firstName);
  const url = escapeHtml(data.url);
  const subject = escapeHtml(data.subject);

  if (template === "welcome") {
    return `<main><h1>${subject}</h1><p>Hi ${firstName},</p><p>Welcome to our family!</p><p><a href="${url}">Visit your account</a></p></main>`;
  }

  if (template === "passwordReset") {
    return `<main><h1>${subject}</h1><p>Hi ${firstName},</p><p>Submit a new password using this link:</p><p><a href="${url}">Reset your password</a></p><p>This link expires in 10 minutes.</p></main>`;
  }

  throw new Error(`Unknown email template: ${template}`);
};

class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.trim().split(/\s+/)[0];
    this.url = url;
    this.from = `Pravah <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    if (process.env.NODE_ENV === "production") {
      // Sendgrid
      return nodemailer.createTransport({
        service: "SendGrid",
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD,
        },
      });
    }

    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  // Send the actual email
  async send(template, subject) {
    // 1) Render HTML from the built-in template
    const html = renderTemplate(template, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });

    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: convert(html),
    };

    // 3) Create a transport and send email
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send("welcome", "Welcome to the Natours Family!");
  }

  async sendPasswordReset() {
    await this.send(
      "passwordReset",
      "Your password reset token (valid for only 10 minutes)",
    );
  }
}

export default Email;
