require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sgMail = require('@sendgrid/mail');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ✅ Environment variable check
if (!process.env.SENDGRID_API_KEY || !process.env.EMAIL_FROM) {
  console.error("❌ Missing SENDGRID_API_KEY or EMAIL_FROM in environment variables!");
  process.exit(1);
}

// ✅ Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// ✅ RSVP endpoint
app.post('/api/rsvp', async (req, res) => {
  const { name, email, guests } = req.body;

  if (!name || !email || !guests) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  // Email to host
  const adminMsg = {
    to: process.env.EMAIL_FROM,
    from: process.env.EMAIL_FROM,
    subject: `💌 New RSVP from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\nGuests: ${guests}`,
    html: `
      <div style="font-family: 'Work Sans', sans-serif; color:#333;">
        <h3>New RSVP Received 🎉</h3>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Guests:</b> ${guests}</p>
      </div>
    `
  };

  // Confirmation email to guest
  const userMsg = {
    to: email,
    from: {
      email: process.env.EMAIL_FROM,
      name: 'Dehan ❤️ Michaela Wedding'
    },
    subject: 'Your RSVP is Confirmed!',
    html: `
      <div style="font-family: 'Work Sans', sans-serif; text-align:center; color:#333; background:#fffafc; padding:25px; border-radius:10px;">
        <h2 style="color:#c85a9e;">Hi ${name},</h2>
        <p style="font-size:16px;">Thank you for RSVPing! We’ve recorded <b>${guests}</b> guest(s).</p>
        <p>We can’t wait to celebrate with you on <b>16 May 2026</b> at Rustic Gem Venue, Cullinan.</p>
        <br>
        <p style="font-size:14px;">💖 With love,<br>Dehan & Michaela</p>
      </div>
    `
  };

  try {
    await Promise.all([sgMail.send(adminMsg), sgMail.send(userMsg)]);
    res.status(200).json({ message: 'RSVP and confirmation email sent successfully ✅' });
  } catch (err) {
    console.error('❌ SendGrid API error:', err.response?.body || err);
    res.status(500).json({ error: 'Failed to send RSVP or confirmation email. Please try again.' });
  }
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
