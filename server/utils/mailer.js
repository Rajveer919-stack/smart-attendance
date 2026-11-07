// Email bhejne ke liye Brevo ki HTTPS API use hoti hai (free: 300 email/din).
// Render ke free plan par SMTP port band hote hai, isliye Gmail SMTP kaam nahi karega.
// Zaroori env variables: BREVO_API_KEY, MAIL_FROM (Brevo me verified sender email)

const isProd = process.env.NODE_ENV === 'production';

async function sendOtpMail(to, code, purpose) {
  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.MAIL_FROM;

  const title = purpose === 'register' ? 'Email verify karo' : 'Password reset';
  const line =
    purpose === 'register'
      ? 'Smart Attendance me register karne ke liye ye OTP daalo:'
      : 'Password badalne ke liye ye OTP daalo:';

  // Key na ho aur local chal raha ho to OTP terminal me dikha do, taki testing ho sake
  if (!apiKey || !from) {
    if (!isProd) {
      console.log('\n[DEV OTP] ' + to + ' -> ' + code + '\n');
      return;
    }
    throw new Error('Email service set nahi hai (BREVO_API_KEY / MAIL_FROM)');
  }

  const html =
    '<div style="font-family:Arial,sans-serif;max-width:420px">' +
    '<h2 style="color:#1e293b">' + title + '</h2>' +
    '<p>' + line + '</p>' +
    '<p style="font-size:32px;letter-spacing:8px;font-weight:bold;color:#4f46e5">' + code + '</p>' +
    '<p style="color:#64748b;font-size:13px">Ye OTP 10 minute tak chalega. Kisi ko mat batao. ' +
    'Agar ye tumne nahi manga to is email ko ignore kar do.</p></div>';

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: process.env.MAIL_FROM_NAME || 'Smart Attendance', email: from },
      to: [{ email: to }],
      subject: 'Smart Attendance OTP: ' + code,
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('Brevo error', res.status, text);
    throw new Error('Email nahi ja pa raha. Thodi der baad try karo');
  }
}

module.exports = { sendOtpMail };