require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sgMail = require('@sendgrid/mail');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/ping', (req, res) => {
  console.log('✅ Ping received from:', req.ip);
  res.send('pong');
});

// ✅ Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`🔹 Incoming ${req.method} request to ${req.url}`);
  next();
});

app.use(express.static('public'));

// ✅ Environment variable check
if (!process.env.SENDGRID_API_KEY || !process.env.EMAIL_FROM) {
  console.error("❌ Missing SENDGRID_API_KEY or EMAIL_FROM in environment variables!");
  process.exit(1);
}

// ✅ Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// ✅ Helper function for sending email with logging
async function sendEmail(msg, label) {
  try {
    console.log(`📤 Attempting to send ${label} email to ${msg.to}`);
    const response = await sgMail.send(msg);
    console.log(`✅ ${label} email sent successfully to ${msg.to}`);
    return response;
  } catch (err) {
    console.error(`❌ Failed to send ${label} email to ${msg.to}:`, err.response?.body || err);
    throw err;
  }
}

// ✅ RSVP endpoint with detailed logging
app.post('/api/rsvp', async (req, res) => {
  console.log('📥 Received RSVP request:', JSON.stringify(req.body));

  const { name, email, guests } = req.body;

  if (!name || !email || !guests) {
    console.warn('⚠️ RSVP missing required fields:', req.body);
    return res.status(400).json({ error: 'All fields are required.' });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.warn('⚠️ Invalid email submitted:', email);
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  // Email to host
  const adminMsg = {
    to: process.env.EMAIL_FROM,
    from: process.env.EMAIL_FROM,
    subject: `💌 New RSVP from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\nGuests: ${guests}`,
    html: `<div>
      <h3>New RSVP Received 🎉</h3>
      <p><b>Name:</b> ${name}</p>
      <p><b>Email:</b> ${email}</p>
      <p><b>Guests:</b> ${guests}</p>
    </div>`
  };

  // Confirmation email to guest
  const userMsg = {
    to: email,
    from: { email: process.env.EMAIL_FROM, name: 'Dehan ❤️ Michaela Wedding' },
    subject: 'Your RSVP is Confirmed!',
    html: `<div style="text-align:center; background:#fffafc; padding:25px; border-radius:10px;">
      <h2 style="color:#c85a9e;">Hi ${name},</h2>
      <p>Thank you for RSVPing! We’ve recorded <b>${guests}</b> guest(s).</p>
      <p>We can’t wait to celebrate with you on <b>16 May 2026</b> at Rustic Gem Venue, Cullinan.</p>
      <p>💖 With love,<br>Dehan & Michaela</p>
    </div>`
  };

  try {
    console.log('📤 Sending emails...');
    await Promise.all([
      sendEmail(adminMsg, 'Admin'),
      sendEmail(userMsg, 'Guest confirmation')
    ]);
    console.log('✅ Emails sent successfully for:', email);
    res.status(200).json({ message: 'RSVP and confirmation email sent successfully ✅' });
  } catch (err) {
    console.error('❌ Error sending emails:', err);
    res.status(500).json({ error: 'Failed to send RSVP or confirmation email. Please try again.' });
  }
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
