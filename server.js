require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sgMail = require('@sendgrid/mail');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================
// Health Check
// ============================
app.get('/ping', (req, res) => {
  console.log('✅ Ping received from:', req.ip);
  res.send('pong');
});

// ============================
// Middleware
// ============================
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`🔹 ${req.method} ${req.url}`);
  next();
});

app.use(express.static('public'));

// ============================
// Environment Validation
// ============================
if (!process.env.SENDGRID_API_KEY || !process.env.EMAIL_FROM) {
  console.warn("❌ Missing SENDGRID_API_KEY or EMAIL_FROM in environment variables!");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// ============================
// Helper: Send Email with Logging
// ============================
async function sendEmail(msg, label) {
  try {
    console.log(`📤 Sending ${label} email to ${msg.to}`);
    const response = await sgMail.send(msg);
    console.log(`✅ ${label} email delivered to ${msg.to}`);
    return response;
  } catch (err) {
    console.error(`❌ ${label} email failed:`, err.response?.body || err);
    throw err;
  }
}

// ============================
// RSVP Endpoint
// ============================
app.post('/api/rsvp', async (req, res) => {
  console.log('📥 Incoming RSVP:', JSON.stringify(req.body));

  const { names, email, guests } = req.body;

  if (!names || !email || !guests) {
    console.warn("⚠️ RSVP missing required fields");
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const { adults = 0, kids = 0 } = guests;

  // Convert names array → string
  const nameList = Array.isArray(names) ? names.join(', ') : names;

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.warn("⚠️ Invalid email:", email);
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  // ============================
  // Email to Host
  // ============================
  const adminMsg = {
    to: process.env.EMAIL_FROM,
    from: {
      email: process.env.EMAIL_FROM,
      name: "Dehan & Michaela Wedding"
    },
    replyTo: email,
    subject: `New RSVP from ${nameList}`,
    text: `New RSVP:
Names: ${nameList}
Email: ${email}
Adults: ${adults}
Children: ${kids}
`,
    html: `
      <div style="font-family:'Arial', sans-serif; padding:20px; background:#ffffff; border-radius:8px;">
        <h2 style="color:#6f42c1; margin-bottom:10px;">New RSVP Received</h2>

        <p><strong>Names:</strong> ${nameList}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Adults:</strong> ${adults}</p>
        <p><strong>Children:</strong> ${kids}</p>

        <hr style="border:none; border-top:1px solid #eee; margin:25px 0;">
        <p style="font-size:12px; color:#777;">This message was generated automatically by your wedding website.</p>
      </div>
    `
  };

  // ============================
  // Confirmation Email to Guest
  // ============================
  const userMsg = {
    to: email,
    from: {
      email: process.env.EMAIL_FROM,
      name: "Dehan & Michaela Wedding"
    },
    replyTo: process.env.EMAIL_FROM,
    subject: "Your RSVP is Confirmed",
    text: `Hi ${nameList}, your RSVP is confirmed.

Adults: ${adults}
Children: ${kids}

We look forward to celebrating with you on 16 May 2026 at Rustic Gem Venue, Cullinan.
`,
    html: `
      <div style="font-family:'Arial', sans-serif; background:#f8f2fc; padding:30px; border-radius:14px; text-align:center; color:#2f2f2f;">
        
        <h2 style="color:#6f42c1; margin-bottom:10px;">Hi ${nameList},</h2>
        <p style="font-size:16px; line-height:1.6;">
          Thank you for RSVPing! We’ve recorded 
          <strong>${adults}</strong> adult(s) and 
          <strong>${kids}</strong> child(ren).
        </p>

        <p style="font-size:16px; margin-top:10px;">
          We look forward to celebrating with you on 
          <strong>16 May 2026</strong> at 
          <strong>Rustic Gem Venue, Cullinan</strong>.
        </p>

        <div style="
          margin:30px auto;
          width:90%;
          max-width:400px;
          padding:15px;
          background:#fff;
          border-radius:12px;
          border:2px solid #6f42c169;
          box-shadow:0 0 15px #6f42c144;
        ">
          <p style="margin:0; font-size:15px;">
            <strong style="color:#6f42c1;">Your RSVP has been recorded</strong>
          </p>
        </div>

        <p style="margin-top:25px;">With love,<br><strong>Dehan & Michaela</strong></p>

        <hr style="border:none; border-top:1px solid #ccc; margin:40px 0 15px;">
        <p style="font-size:12px; color:#777;">
          You received this email because you submitted an RSVP on our wedding website.
        </p>

      </div>
    `
  };

  // ============================
  // Send Both Emails
  // ============================
  try {
    console.log("📤 Sending emails…");

    await Promise.all([
      sendEmail(adminMsg, 'Admin'),
      sendEmail(userMsg, 'Guest Confirmation')
    ]);

    console.log("✅ All emails sent successfully.");
    res.status(200).json({ message: 'RSVP and confirmation email sent successfully.' });

  } catch (err) {
    console.error("❌ Email error:", err);
    res.status(500).json({ error: 'Failed to send one or more emails.' });
  }
});

// ============================
// Start Server
// ============================
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
