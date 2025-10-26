require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Setup Gmail transporter
console.log(process.env.EMAIL_USER, process.env.EMAIL_PASS ? 'PASS_LOADED' : 'PASS_MISSING');
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

app.post('/api/rsvp', async (req, res) => {
  const { name, email, guests } = req.body;

  if (!name || !email || !guests) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Email to the host
  const adminMail = {
    from: `"RSVP Form" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject: `New RSVP from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\nGuests: ${guests}`
  };

  // Confirmation email to the user
  const userMail = {
    from: `"Event Team" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Your RSVP is Confirmed!`,
    text: `Hi ${name},\n\nThanks for RSVPing! We’ve recorded ${guests} guest(s).\n\nSee you there!\n\n– Event Team`
  };

  try {
    await Promise.all([
      transporter.sendMail(adminMail),
      transporter.sendMail(userMail)
    ]);
    res.status(200).json({ message: 'RSVP and confirmation email sent successfully' });
  } catch (err) {
    console.error('Email send error:', err);
    res.status(500).json({ error: 'Failed to send RSVP or confirmation email' });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

