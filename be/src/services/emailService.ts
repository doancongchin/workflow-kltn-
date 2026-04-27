import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';

let transporter: nodemailer.Transporter | null = null;
let sendgridEnabled = false;

async function initEmailService() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', 
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('✅ Using SMTP (Gmail)');
    return;
  }

  const sgApiKey = process.env.SENDGRID_API_KEY;
  if (sgApiKey && sgApiKey.startsWith('SG.')) {
    sgMail.setApiKey(sgApiKey);
    sendgridEnabled = true;
    console.log('✅ Using SendGrid for email');
    return;
  }

  const testAccount = await nodemailer.createTestAccount();
  transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  console.log('📧 Using Ethereal email (test)');
  console.log(`   Test account: ${testAccount.user}`);
}

export async function sendResetPasswordEmail(to: string, resetLink: string): Promise<void> {
  if (transporter === null && !sendgridEnabled) {
    await initEmailService();
  }

  const fromEmail = process.env.FROM_EMAIL || 'noreply@workflow.local';

  if (sendgridEnabled) {
    const msg = {
      to,
      from: fromEmail,
      subject: 'Đặt lại mật khẩu - Workflow System',
      html: `
        <h2>Yêu cầu đặt lại mật khẩu</h2>
        <p>Bạn vừa yêu cầu đặt lại mật khẩu. Nhấn vào link bên dưới để tiếp tục:</p>
        <a href="${resetLink}" target="_blank">${resetLink}</a>
        <p>Link này sẽ hết hạn sau 1 giờ.</p>
        <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
      `,
    };
    await sgMail.send(msg);
    console.log(`📧 Email sent to ${to} via SendGrid`);
    return;
  }

  if (!transporter) {
    await initEmailService();
  }
  const mailOptions = {
    from: fromEmail,
    to,
    subject: 'Đặt lại mật khẩu',
    html: `
      <h2>Yêu cầu đặt lại mật khẩu</h2>
      <p>Bạn vừa yêu cầu đặt lại mật khẩu. Nhấn vào link bên dưới để tiếp tục:</p>
      <a href="${resetLink}" target="_blank">${resetLink}</a>
      <p>Link này sẽ hết hạn sau 1 giờ.</p>
      <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
    `,
  };
  const info = await transporter!.sendMail(mailOptions);
  console.log(`📧 Email sent to ${to}`);
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) console.log(`🔗 Preview URL: ${previewUrl}`);
}