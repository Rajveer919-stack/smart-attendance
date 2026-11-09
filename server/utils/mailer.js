// Email bhejne ke liye Brevo ki HTTPS API use hoti hai (free: 300 email/din).
// Render ke free plan par SMTP port band hote hai, isliye Gmail SMTP kaam nahi karega.
// Zaroori env variables: BREVO_API_KEY, MAIL_FROM (Brevo me verified sender email)

const isProd = process.env.NODE_ENV === 'production';

const esc = (v) =>
  String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Brevo ko email de deta hai. Key na ho aur local chal raha ho to terminal me dikha deta hai
async function deliver(to, subject, html, devLine) {
  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.MAIL_FROM;

  if (!apiKey || !from) {
    if (!isProd) {
      console.log('\n' + devLine + '\n');
      return;
    }
    throw new Error('Email service set nahi hai (BREVO_API_KEY / MAIL_FROM)');
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: process.env.MAIL_FROM_NAME || 'Smart Attendance', email: from },
      to: [{ email: to }],
      subject,
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

async function sendOtpMail(to, code, purpose) {
  const title = purpose === 'register' ? 'Email verify karo' : 'Password reset';
  const line =
    purpose === 'register'
      ? 'Smart Attendance me register karne ke liye ye OTP daalo:'
      : 'Password badalne ke liye ye OTP daalo:';

  const html =
    '<div style="font-family:Arial,sans-serif;max-width:420px">' +
    '<h2 style="color:#1e293b">' + title + '</h2>' +
    '<p>' + line + '</p>' +
    '<p style="font-size:32px;letter-spacing:8px;font-weight:bold;color:#4f46e5">' + code + '</p>' +
    '<p style="color:#64748b;font-size:13px">Ye OTP 10 minute tak chalega. Kisi ko mat batao. ' +
    'Agar ye tumne nahi manga to is email ko ignore kar do.</p></div>';

  await deliver(to, 'Smart Attendance OTP: ' + code, html, '[DEV OTP] ' + to + ' -> ' + code);
}

// Kam attendance wale student ko chetavni email (English me, taki sab samajh sake)
async function sendLowAttendanceMail(to, info) {
  const html =
    '<div style="font-family:Arial,sans-serif;max-width:480px">' +
    '<h2 style="color:#b91c1c">Low attendance alert</h2>' +
    '<p>Hi ' + esc(info.name) + ',</p>' +
    '<p>Your attendance in <b>' + esc(info.subjectName) + '</b> (' + esc(info.code) + ') is ' +
    '<b style="color:#b91c1c">' + esc(info.percentage) + '%</b> (' + esc(info.attended) + ' of ' +
    esc(info.total) + ' classes). The minimum required is 75%.</p>' +
    '<p>You need to attend the next <b>' + esc(info.need) + '</b> classes in a row to reach 75%.</p>' +
    '<p style="color:#64748b;font-size:13px">Please attend regularly. This is an automatic message ' +
    'from Smart Attendance.</p></div>';

  await deliver(
    to,
    'Attendance alert: ' + info.subjectName + ' is below 75%',
    html,
    '[DEV ALERT] ' + to + ' -> ' + info.subjectName + ' ' + info.percentage + '%'
  );
}

module.exports = { sendOtpMail, sendLowAttendanceMail };