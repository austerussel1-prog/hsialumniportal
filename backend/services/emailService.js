const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');

const emailUser = String(process.env.EMAIL_USER || '').trim();
const emailPassword = String(process.env.EMAIL_PASSWORD || '').trim();
const mailFromName = String(process.env.MAIL_FROM_NAME || 'Highly Succeed Portal').trim();

// Prefer explicit SMTP config in production to avoid provider "service" auto-config issues.
const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || smtpPort === 465;
const resendApiKey = String(process.env.RESEND_API_KEY || '').trim();
const resendFrom = String(process.env.RESEND_FROM || process.env.EMAIL_USER || 'onboarding@resend.dev').trim();
const gmailOauthClientId = String(process.env.GMAIL_OAUTH_CLIENT_ID || '').trim();
const gmailOauthClientSecret = String(process.env.GMAIL_OAUTH_CLIENT_SECRET || '').trim();
const gmailOauthRefreshToken = String(process.env.GMAIL_OAUTH_REFRESH_TOKEN || '').trim();
const gmailSenderEmail = String(process.env.GMAIL_SENDER_EMAIL || process.env.EMAIL_USER || '').trim();

const formatFromAddress = (rawEmail) => {
  const safeEmail = String(rawEmail || '').trim();
  if (!safeEmail) return '';
  if (!mailFromName) return safeEmail;
  return `${mailFromName} <${safeEmail}>`;
};

if (!emailUser || !emailPassword) {
  console.warn('[email] Missing SMTP credentials at startup', {
    hasEmailUser: Boolean(emailUser),
    hasEmailPassword: Boolean(emailPassword),
  });
}

const smtpTimeouts = {
  connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 30000),
  greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 30000),
  socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 30000),
};

const createSmtpTransport = (overrides = {}) => nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  requireTLS: !smtpSecure,
  ...smtpTimeouts,
  auth: {
    user: emailUser,
    pass: emailPassword,
  },
  ...overrides,
});

const transporter = createSmtpTransport();

const assertEmailConfig = () => {
  if (!emailUser || !emailPassword) {
    throw new Error('Server email config missing: EMAIL_USER and/or EMAIL_PASSWORD');
  }
};

const hasUsableGmailApi = () => Boolean(
  gmailOauthClientId && gmailOauthClientSecret && gmailOauthRefreshToken && gmailSenderEmail,
);
const hasUsableSmtp = () => Boolean(emailUser && emailPassword);
const hasUsableResend = () => Boolean(
  resendApiKey && resendApiKey.startsWith('re_'),
);
const activeEmailMode = hasUsableResend() ? 'resend' : (hasUsableGmailApi() ? 'gmail_api' : 'smtp');
console.log('[email] Provider mode:', activeEmailMode);

const shouldFallbackFromResend = (error) => {
  const message = String(error?.message || '');
  return /resend api error \(4\d{2}\)|validation_error|verify a domain|testing emails|change the "from" address/i.test(message);
};

const toBase64Url = (input) => Buffer.from(input, 'utf8')
  .toString('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/g, '');

const buildGmailRawMessage = (mailOptions) => {
  const to = String(mailOptions?.to || '').trim();
  const replyTo = String(mailOptions?.replyTo || '').trim();
  const subject = String(mailOptions?.subject || 'HSI Alumni Portal').trim();
  const html = String(mailOptions?.html || '').trim();
  const text = String(mailOptions?.text || '').trim() || (html ? html.replace(/<[^>]+>/g, ' ') : '');
  const attachments = Array.isArray(mailOptions?.attachments) ? mailOptions.attachments : [];
  const from = String(mailOptions?.from || gmailSenderEmail).trim();

  const commonHeaders = [
    `From: ${from}`,
    `To: ${to}`,
    replyTo ? `Reply-To: ${replyTo}` : '',
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
  ].filter(Boolean);

  if (!attachments.length) {
    const body = [
      ...commonHeaders,
      'Content-Type: text/html; charset="UTF-8"',
      '',
      html || text || 'No content',
    ].join('\r\n');
    return toBase64Url(body);
  }

  const boundary = `mixed_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const parts = [
    ...commonHeaders,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    '',
    html || text || 'No content',
  ];

  for (const attachment of attachments) {
    const filename = String(attachment?.filename || 'attachment').replace(/"/g, '');
    const contentType = String(attachment?.contentType || 'application/octet-stream');
    const contentBuffer = Buffer.isBuffer(attachment?.content)
      ? attachment.content
      : Buffer.from(String(attachment?.content || ''), 'utf8');

    parts.push(
      `--${boundary}`,
      `Content-Type: ${contentType}; name="${filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${filename}"`,
      '',
      contentBuffer.toString('base64'),
    );
  }

  parts.push(`--${boundary}--`, '');
  return Buffer.from(parts.join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
};

const sendViaGmailApi = async (mailOptions) => {
  const oauthClient = new OAuth2Client(gmailOauthClientId, gmailOauthClientSecret);
  oauthClient.setCredentials({ refresh_token: gmailOauthRefreshToken });

  const tokenResponse = await oauthClient.getAccessToken();
  const accessToken = tokenResponse?.token || '';
  if (!accessToken) throw new Error('Unable to obtain Gmail API access token');

  const raw = buildGmailRawMessage(mailOptions);
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Gmail API error (${response.status}): ${body || 'Unknown error'}`);
  }

  return true;
};

const sendViaResend = async (mailOptions) => {
  const to = String(mailOptions?.to || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (!to.length) {
    throw new Error('No recipient configured for email delivery');
  }

  const attachments = Array.isArray(mailOptions?.attachments)
    ? mailOptions.attachments.map((att) => ({
      filename: att.filename || 'attachment',
      content: Buffer.isBuffer(att.content)
        ? att.content.toString('base64')
        : Buffer.from(String(att.content || ''), 'utf8').toString('base64'),
      content_type: att.contentType || 'application/octet-stream',
    }))
    : [];

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: mailOptions?.from || formatFromAddress(resendFrom),
      to,
      reply_to: mailOptions?.replyTo || undefined,
      subject: mailOptions?.subject || 'HSI Alumni Portal',
      html: mailOptions?.html || undefined,
      text: mailOptions?.text || undefined,
      attachments,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Resend API error (${response.status}): ${body || 'Unknown error'}`);
  }

  return true;
};

const sendMail = async (mailOptions) => {
  if (hasUsableResend()) {
    try {
      return await sendViaResend(mailOptions);
    } catch (error) {
      const wrappedError = new Error(`Resend delivery failed: ${error.message}`);
      const canFallback = hasUsableGmailApi() || hasUsableSmtp();

      if (!canFallback || !shouldFallbackFromResend(error)) {
        throw wrappedError;
      }

      console.warn('[email] Resend failed, falling back to alternate provider', {
        reason: error.message,
        fallback: hasUsableGmailApi() ? 'gmail_api' : 'smtp',
      });
    }
  }

  if (hasUsableGmailApi()) {
    try {
      return await sendViaGmailApi(mailOptions);
    } catch (error) {
      throw new Error(`Gmail API delivery failed: ${error.message}`);
    }
  }

  assertEmailConfig();
  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    // Gmail SMTP can be flaky on some hosts; retry with alternate Gmail configs.
    const retries = [
      createSmtpTransport({ host: 'smtp.gmail.com', port: 587, secure: false, requireTLS: true }),
      createSmtpTransport({ host: 'smtp.gmail.com', port: 465, secure: true, requireTLS: false }),
      nodemailer.createTransport({
        service: 'gmail',
        ...smtpTimeouts,
        auth: { user: emailUser, pass: emailPassword },
      }),
    ];

    for (const candidate of retries) {
      try {
        await candidate.sendMail(mailOptions);
        return true;
      } catch (_retryError) {
        // try next transport
      }
    }

    throw new Error(`SMTP delivery failed: ${error.message}`);
  }
};

const sendJobApplicationEmail = async ({ applicant, job, resume }) => {
  assertEmailConfig();
  const recipient = process.env.APPLICATION_RECEIVER_EMAIL || process.env.EMAIL_USER;

  const safe = (value) => (value ? String(value) : '').trim();
  const applicantName = safe(applicant?.name);
  const applicantEmail = safe(applicant?.email);
  const applicantPhone = safe(applicant?.phone);
  const applicantMobile = safe(applicant?.mobile);
  const startDate = safe(applicant?.startDate);
  const coverLetter = safe(applicant?.coverLetter);

  const jobId = safe(job?.jobId);
  const jobTitle = safe(job?.jobTitle);
  const company = safe(job?.company);

  const subjectPieces = ['HSI Alumni Portal - Job Application'];
  if (jobTitle) subjectPieces.push(jobTitle);
  if (company) subjectPieces.push(company);

  const mailOptions = {
    from: formatFromAddress(process.env.EMAIL_USER),
    to: recipient,
    replyTo: applicantEmail || undefined,
    subject: subjectPieces.join(' | '),
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 760px; margin: 0 auto;">
        <h2 style="color: #EAB308;">HSI Alumni Portal</h2>
        <p style="margin-top: 6px; color: #111827; font-weight: 700;">New job application received.</p>

        <div style="margin-top: 18px; padding: 14px; border: 1px solid #e5e7eb; border-radius: 10px; background: #ffffff;">
          <div style="font-weight: 700; color: #111827; margin-bottom: 8px;">Applicant</div>
          <div style="color: #374151; line-height: 1.6;">
            <div><strong>Name:</strong> ${applicantName || 'N/A'}</div>
            <div><strong>Email:</strong> ${applicantEmail || 'N/A'}</div>
            <div><strong>Phone:</strong> ${applicantPhone || 'N/A'}</div>
            <div><strong>Mobile:</strong> ${applicantMobile || 'N/A'}</div>
            <div><strong>Earliest Start Date:</strong> ${startDate || 'N/A'}</div>
          </div>
        </div>

        <div style="margin-top: 14px; padding: 14px; border: 1px solid #e5e7eb; border-radius: 10px; background: #ffffff;">
          <div style="font-weight: 700; color: #111827; margin-bottom: 8px;">Job</div>
          <div style="color: #374151; line-height: 1.6;">
            <div><strong>Job Title:</strong> ${jobTitle || 'N/A'}</div>
            <div><strong>Company:</strong> ${company || 'N/A'}</div>
            <div><strong>Job ID:</strong> ${jobId || 'N/A'}</div>
          </div>
        </div>

        <div style="margin-top: 14px; padding: 14px; border: 1px solid #e5e7eb; border-radius: 10px; background: #ffffff;">
          <div style="font-weight: 700; color: #111827; margin-bottom: 8px;">Cover Letter</div>
          <div style="color: #374151; line-height: 1.7; white-space: pre-wrap;">${coverLetter || 'N/A'}</div>
        </div>

        <p style="margin-top: 14px; color: #6b7280; font-size: 12px;">
          Resume is attached to this email.
        </p>
      </div>
    `,
    attachments: resume?.content ? [{
      filename: resume.filename || 'resume',
      content: resume.content,
      contentType: resume.contentType || 'application/octet-stream',
    }] : [],
  };

  try {
    await sendMail(mailOptions);
    console.log('Job application email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending job application email:', error);
    throw error;
  }
};

// Send OTP email
const sendOTP = async (email, otp) => {
  assertEmailConfig();
  const mailOptions = {
    from: formatFromAddress(process.env.EMAIL_USER),
    to: email,
    subject: 'HSI Alumni Portal - Email Verification OTP',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #EAB308;">HSI Alumni Portal</h2>
        <p>Thank you for registering with HSI Alumni Portal!</p>
        <p>Your One-Time Password (OTP) for email verification is:</p>
        <h1 style="color: #EAB308; font-size: 36px; letter-spacing: 5px; text-align: center; background: #f5f5f5; padding: 20px; border-radius: 8px;">
          ${otp}
        </h1>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <br>
        <p style="color: #666; font-size: 12px;">Best regards,<br>HSI Alumni Portal Team</p>
      </div>
    `,
  };

  try {
    await sendMail(mailOptions);
    console.log('OTP email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw error;
  }
};

// Send rejection notification
const sendRejectionEmail = async (email, name, reason = '') => {
  assertEmailConfig();
  const mailOptions = {
    from: formatFromAddress(process.env.EMAIL_USER),
    to: email,
    subject: 'HSI Alumni Portal - Registration Status',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #EAB308;">HSI Alumni Portal</h2>
        <p>Dear ${name},</p>
        <p>Thank you for your interest in joining the HSI Alumni Portal.</p>
        <p style="color: #DC2626; font-weight: bold;">Unfortunately, your registration has not been approved at this time.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>If you believe this is an error or have questions, please contact our support team.</p>
        <br>
        <p style="color: #666; font-size: 12px;">Best regards,<br>HSI Alumni Portal Team</p>
      </div>
    `,
  };

  try {
    await sendMail(mailOptions);
    console.log('Rejection email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending rejection email:', error);
    throw error;
  }
};

// Send approval notification
const sendApprovalEmail = async (email, name) => {
  assertEmailConfig();
  const mailOptions = {
    from: formatFromAddress(process.env.EMAIL_USER),
    to: email,
    subject: 'HSI Alumni Portal - Registration Approved!',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #EAB308;">HSI Alumni Portal</h2>
        <p>Dear ${name},</p>
        <p style="color: #16A34A; font-weight: bold;">Congratulations! Your registration has been approved.</p>
        <p>You can now log in to the HSI Alumni Portal and access all features.</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" 
           style="display: inline-block; background: #EAB308; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Login to Your Account
        </a>
        <br>
        <p style="color: #666; font-size: 12px;">Best regards,<br>HSI Alumni Portal Team</p>
      </div>
    `,
  };

  try {
    await sendMail(mailOptions);
    console.log('Approval email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending approval email:', error);
    throw error;
  }
};

// Send referral invitation
const sendReferralInvitationEmail = async (toEmail, jobLink, customMessage = '') => {
  assertEmailConfig();
  const messageBody = customMessage && customMessage.trim()
    ? customMessage.trim()
    : 'Hi! I wanted to share this job opportunity with you.';

  const mailOptions = {
    from: formatFromAddress(process.env.EMAIL_USER),
    to: toEmail,
    subject: 'HSI Alumni Portal - Job Referral Invitation',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #EAB308;">HSI Alumni Portal</h2>
        <p>${messageBody}</p>
        <p><strong>Referral Link:</strong></p>
        <p>
          <a href="${jobLink}" target="_blank" rel="noopener noreferrer">${jobLink}</a>
        </p>
        <br>
        <p style="color: #666; font-size: 12px;">Best regards,<br>HSI Alumni Portal Team</p>
      </div>
    `,
  };

  try {
    await sendMail(mailOptions);
    console.log('Referral invitation email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending referral invitation email:', error);
    throw error;
  }
};

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const sendAdminVerificationEmail = async ({
  email,
  name,
  role,
  temporaryPassword,
  verificationUrl,
  expiresAt,
}) => {
  assertEmailConfig();

  const recipient = String(email || '').trim();
  if (!recipient) {
    throw new Error('Recipient email is required');
  }

  const safeName = String(name || '').trim() || 'Admin User';
  const safeRole = String(role || 'admin').trim().replace(/_/g, ' ');
  const safeTemporaryPassword = String(temporaryPassword || '').trim();
  const safeVerificationUrl = String(verificationUrl || '').trim();

  if (!safeTemporaryPassword || !safeVerificationUrl) {
    throw new Error('Temporary password and verification URL are required');
  }

  const expiryLabel = formatDateTime(expiresAt) || 'within 24 hours';
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;

  const mailOptions = {
    from: formatFromAddress(process.env.EMAIL_USER),
    to: recipient,
    subject: 'HSI Alumni Portal - Verify Your Admin Account',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 640px; margin: 0 auto;">
        <h2 style="color: #EAB308;">HSI Alumni Portal</h2>
        <p>Dear ${escapeHtml(safeName)},</p>
        <p>An administrator created a new ${escapeHtml(safeRole)} account for you.</p>
        <p>Your account will remain pending until you verify this email address.</p>

        <div style="margin: 18px 0; padding: 16px; border: 1px solid #e5e7eb; border-radius: 10px; background: #ffffff;">
          <div style="margin-bottom: 8px;"><strong>Email:</strong> ${escapeHtml(recipient)}</div>
          <div style="margin-bottom: 8px;"><strong>Role:</strong> ${escapeHtml(safeRole)}</div>
          <div><strong>Temporary Password:</strong> ${escapeHtml(safeTemporaryPassword)}</div>
        </div>

        <a href="${escapeHtml(safeVerificationUrl)}"
           style="display: inline-block; background: #EAB308; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 12px 0 18px;">
          Verify Admin Account
        </a>

        <p>This verification link expires ${escapeHtml(expiryLabel)}.</p>
        <p>After verification, you can sign in here:</p>
        <p><a href="${escapeHtml(loginUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(loginUrl)}</a></p>
        <p>If you were not expecting this email, please ignore it.</p>
        <br>
        <p style="color: #666; font-size: 12px;">Best regards,<br>HSI Alumni Portal Team</p>
      </div>
    `,
  };

  await sendMail(mailOptions);
  return true;
};

const pickEmailRecipient = (...candidates) => {
  for (const raw of candidates) {
    const value = String(raw || '').trim();
    if (value && value.includes('@')) return value;
  }
  return '';
};

const formatDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const sendDataRemovalDecisionEmail = async ({
  email,
  name,
  status,
  note = '',
  scheduledDeletionAt = null,
  finalAction = 'delete',
}) => {
  assertEmailConfig();
  const safeEmail = String(email || '').trim();
  if (!safeEmail) throw new Error('Recipient email is required');

  const safeName = String(name || '').trim() || 'User';
  const normalizedStatus = String(status || '').trim().toLowerCase();
  const isApproved = normalizedStatus === 'approved';
  const subject = isApproved
    ? 'HSI Alumni Portal - Data Removal Request Approved'
    : 'HSI Alumni Portal - Data Removal Request Update';
  const formattedSchedule = formatDateTime(scheduledDeletionAt);
  const safeNote = String(note || '').trim();
  const safeFinalAction = String(finalAction || 'delete').trim().toLowerCase() === 'anonymize'
    ? 'anonymize'
    : 'delete';
  const frontEndUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const approvedBody = `
    <p style="color: #16A34A; font-weight: bold;">Your data removal request has been approved.</p>
    <p>Your account has been scheduled for privacy cleanup.</p>
    ${formattedSchedule ? `<p><strong>Scheduled completion:</strong> ${escapeHtml(formattedSchedule)}</p>` : ''}
    <p><strong>Final action:</strong> ${safeFinalAction === 'anonymize' ? 'Anonymize account data' : 'Delete account data'}</p>
    <p>For security and privacy compliance, this account can no longer be used for login.</p>
  `;
  const rejectedBody = `
    <p style="color: #DC2626; font-weight: bold;">Your data removal request was not approved.</p>
    <p>Your account remains active and you may continue using the portal.</p>
    <a href="${frontEndUrl}/profile"
      style="display: inline-block; background: #EAB308; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin: 14px 0;">
      View Account
    </a>
  `;

  const mailOptions = {
    from: formatFromAddress(process.env.EMAIL_USER),
    to: safeEmail,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 640px; margin: 0 auto;">
        <h2 style="color: #EAB308;">HSI Alumni Portal</h2>
        <p>Dear ${escapeHtml(safeName)},</p>
        ${isApproved ? approvedBody : rejectedBody}
        ${safeNote ? `<p><strong>Admin note:</strong> ${escapeHtml(safeNote)}</p>` : ''}
        <p>If you have questions, please contact support.</p>
        <br>
        <p style="color: #666; font-size: 12px;">Best regards,<br>HSI Alumni Portal Team</p>
      </div>
    `,
  };

  await sendMail(mailOptions);
  return true;
};

const sendAccountFeedbackEmail = async ({ user, feedback }) => {
  assertEmailConfig();
  const companyEmail = pickEmailRecipient(
    process.env.COMPANY_FEEDBACK_EMAIL,
    process.env.ACCOUNT_FEEDBACK_RECEIVER_EMAIL,
    process.env.EMAIL_USER,
  );

  if (!companyEmail) {
    throw new Error('No feedback recipient email configured');
  }

  const name = String(user?.name || '').trim() || 'Unknown User';
  const email = String(user?.email || '').trim() || 'N/A';
  const role = String(user?.role || '').trim() || 'user';
  const subject = String(feedback?.subject || '').trim() || 'Account Feedback';
  const message = String(feedback?.message || '').trim();
  const rating = Number(feedback?.rating || 0);
  const feedbackType = String(feedback?.feedbackType || '').trim();
  const program = String(feedback?.program || '').trim();
  const targetUserName = String(feedback?.targetUserName || '').trim();
  const targetUserEmail = String(feedback?.targetUserEmail || '').trim();
  const npsScore = feedback?.npsScore === null || typeof feedback?.npsScore === 'undefined'
    ? null
    : Number(feedback.npsScore);

  const feedbackTypeLabel = {
    alumni_feedback: 'Alumni Feedback',
    program_evaluation: 'Program Evaluation',
    suggestion_improvement: 'Suggestion & Improvement',
    website_nps: 'Website Feedback & NPS',
  }[feedbackType] || 'General Feedback';

  const extraRows = [];
  if (feedbackType === 'program_evaluation' && program) {
    extraRows.push(`<div><strong>Program:</strong> ${escapeHtml(program)}</div>`);
  }
  if (feedbackType === 'alumni_feedback') {
    extraRows.push(`<div><strong>Target Alumni:</strong> ${escapeHtml(targetUserName || 'N/A')}</div>`);
    extraRows.push(`<div><strong>Target Alumni Email:</strong> ${escapeHtml(targetUserEmail || 'N/A')}</div>`);
  }
  if (feedbackType === 'website_nps') {
    extraRows.push(`<div><strong>NPS Score:</strong> ${Number.isFinite(npsScore) ? npsScore : 'N/A'}</div>`);
  }

  const mailOptions = {
    from: formatFromAddress(process.env.EMAIL_USER),
    to: companyEmail,
    replyTo: email !== 'N/A' ? email : undefined,
    subject: `HSI Alumni Portal - Account Feedback: ${subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 700px; margin: 0 auto;">
        <h2 style="color: #EAB308; margin: 0 0 8px;">HSI Alumni Portal</h2>
        <p style="margin: 0 0 16px; color: #111827; font-weight: 700;">New account feedback received.</p>

        <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; margin-bottom: 12px;">
          <div style="font-weight: 700; color: #111827; margin-bottom: 8px;">Sender</div>
          <div style="color: #374151; line-height: 1.6;">
            <div><strong>Name:</strong> ${escapeHtml(name)}</div>
            <div><strong>Email:</strong> ${escapeHtml(email)}</div>
            <div><strong>Role:</strong> ${escapeHtml(role)}</div>
          </div>
        </div>

        <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; margin-bottom: 12px;">
          <div style="font-weight: 700; color: #111827; margin-bottom: 8px;">Feedback Details</div>
          <div style="color: #374151; line-height: 1.6;">
            <div><strong>Subject:</strong> ${escapeHtml(subject)}</div>
            <div><strong>Type:</strong> ${escapeHtml(feedbackTypeLabel)}</div>
            <div><strong>Rating:</strong> ${Number.isFinite(rating) && rating > 0 ? rating : 'N/A'}</div>
            ${extraRows.join('')}
          </div>
        </div>

        <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px;">
          <div style="font-weight: 700; color: #111827; margin-bottom: 8px;">Message</div>
          <div style="color: #374151; line-height: 1.7; white-space: pre-wrap;">${escapeHtml(message || 'No message provided.')}</div>
        </div>
      </div>
    `,
  };

  await sendMail(mailOptions);
  return true;
};

const sendEventFeedbackEmail = async ({ event, feedback }) => {
  assertEmailConfig();
  const primaryRecipient = pickEmailRecipient(
    process.env.EVENT_FEEDBACK_RECEIVER_EMAIL,
    process.env.COMPANY_FEEDBACK_EMAIL,
    process.env.EMAIL_USER,
  );

  if (!primaryRecipient) {
    throw new Error('No event feedback recipient email configured');
  }
  const recipientList = Array.from(new Set([
    primaryRecipient,
    process.env.EMAIL_USER,
  ].filter(Boolean)));

  const eventTitle = String(event?.title || 'Event').trim();
  const eventDate = event?.startDate ? new Date(event.startDate).toLocaleString() : 'N/A';
  const eventPlace = event?.isVirtual ? 'Online' : (event?.location || 'N/A');
  const senderName = String(feedback?.name || '').trim() || 'Anonymous';
  const senderEmail = String(feedback?.email || '').trim() || 'N/A';
  const rating = Number(feedback?.rating || 0);
  const comments = String(feedback?.comments || '').trim();

  const mailOptions = {
    from: formatFromAddress(process.env.EMAIL_USER),
    to: recipientList.join(', '),
    replyTo: senderEmail !== 'N/A' ? senderEmail : undefined,
    subject: `HSI Alumni Portal - Event Feedback: ${eventTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 700px; margin: 0 auto;">
        <h2 style="color: #EAB308; margin: 0 0 8px;">HSI Alumni Portal</h2>
        <p style="margin: 0 0 16px; color: #111827; font-weight: 700;">New event feedback submission received.</p>

        <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; margin-bottom: 12px;">
          <div style="font-weight: 700; color: #111827; margin-bottom: 8px;">Event</div>
          <div style="color: #374151; line-height: 1.6;">
            <div><strong>Title:</strong> ${escapeHtml(eventTitle)}</div>
            <div><strong>Date:</strong> ${escapeHtml(eventDate)}</div>
            <div><strong>Location:</strong> ${escapeHtml(eventPlace)}</div>
          </div>
        </div>

        <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; margin-bottom: 12px;">
          <div style="font-weight: 700; color: #111827; margin-bottom: 8px;">Sender</div>
          <div style="color: #374151; line-height: 1.6;">
            <div><strong>Name:</strong> ${escapeHtml(senderName)}</div>
            <div><strong>Email:</strong> ${escapeHtml(senderEmail)}</div>
            <div><strong>Rating:</strong> ${Number.isFinite(rating) ? rating : 'N/A'}</div>
          </div>
        </div>

        <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px;">
          <div style="font-weight: 700; color: #111827; margin-bottom: 8px;">Feedback</div>
          <div style="color: #374151; line-height: 1.7; white-space: pre-wrap;">${escapeHtml(comments || 'No comments provided.')}</div>
        </div>
      </div>
    `,
  };

  await sendMail(mailOptions);
  return true;
};

module.exports = {
  sendOTP,
  sendRejectionEmail,
  sendApprovalEmail,
  sendAdminVerificationEmail,
  sendDataRemovalDecisionEmail,
  sendReferralInvitationEmail,
  sendJobApplicationEmail,
  sendEventFeedbackEmail,
  sendAccountFeedbackEmail,
};
