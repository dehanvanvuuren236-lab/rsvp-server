// server.js
const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Replace with your Gmail and app password
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // Use SSL
  auth: {
    user: 'dehanvanvuuren236@gmail.com', // your Gmail
    pass: 'mtwfqlfnaltsoled',    // app password (not your Gmail password)
  }
});

app.post('/api/rsvp', async (req, res) => {
  const { name, email, guests } = req.body;

  if (!name || !email || !guests) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // 1. Email to YOU (event host)
 const adminMail = {
  from: '"RSVP Form" <dehanvanvuuren236@gmail.com>',
  to: 'dehanvanvuuren236@gmail.com', // must be YOUR working Gmail
  subject: `New RSVP from ${name}`,
  text: `Name: ${name}\nEmail: ${email}\nGuests: ${guests}`
};



  // 2. Confirmation Email to USER
  const userMail = {
  from: '"Event Team" <dehanvanvuuren236@gmail.com>',
  to: email, // this stays dynamic
  subject: `Your RSVP is Confirmed!`,
  text: `Hi ${name},\n\nThanks for RSVPing! We’ve recorded ${guests} guest(s) under your name.\n\nSee you there!\n\n– Event Team`
};


  try {
    // Send both emails in parallel
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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
