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
app.use(express.urlencoded({ extended: true }));

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
// Helper: Send Email
// ============================
async function sendEmail(msg, label) {
  try {
    console.log(`📤 Sending ${label} email to ${msg.to}`);
    await sgMail.send(msg);
    console.log(`✅ ${label} email delivered`);
  } catch (err) {
    console.error(`❌ ${label} email failed:`, err.response?.body || err);
    throw err;
  }
}

// ============================
// RSVP Endpoint
// ============================
app.post('/api/rsvp', async (req, res) => {
  const { names, email, guests } = req.body;

  if (!names || !email || !guests) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const { adults = 0, kids = 0 } = guests;
  const nameList = Array.isArray(names) ? names.join(', ') : names;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  const adminMsg = {
    to: process.env.EMAIL_FROM,
    from: process.env.EMAIL_FROM,
    replyTo: email,
    subject: `New RSVP from ${nameList}`,
    html: `
      <h2>New RSVP</h2>
      <p><strong>Names:</strong> ${nameList}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Adults:</strong> ${adults}</p>
      <p><strong>Children:</strong> ${kids}</p>
    `
  };

  const guestMsg = {
    to: email,
    from: process.env.EMAIL_FROM,
    subject: "Your RSVP is Confirmed 💜",
    html: `
      <h2>Hi ${nameList},</h2>
      <p>We’ve recorded:</p>
      <p><strong>${adults}</strong> adult(s)</p>
      <p><strong>${kids}</strong> child(ren)</p>
      <p>We look forward to celebrating with you on 16 May 2026!</p>
      <p>With love,<br>Dehan & Michaela</p>
    `
  };

  try {
    await Promise.all([
      sendEmail(adminMsg, "RSVP Admin"),
      sendEmail(guestMsg, "RSVP Guest")
    ]);

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Email sending failed." });
  }
});

// ============================
// Accommodation Booking (EFT)
// ============================
app.post('/api/accommodation', async (req, res) => {
  const { name, email, adults = 0, kids = 0 } = req.body;

  const total = (adults * 500) + (kids * 250);

  if (!name || !email || total <= 0) {
    return res.status(400).json({ error: "Invalid booking details." });
  }

  const adminMsg = {
    to: process.env.EMAIL_FROM,
    from: process.env.EMAIL_FROM,
    subject: `Accommodation Booking - ${name}`,
    html: `
      <h2>Accommodation Booking</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Adults:</strong> ${adults}</p>
      <p><strong>Children:</strong> ${kids}</p>
      <p><strong>Total Due:</strong> R${total}</p>
    `
  };

  const guestMsg = {
    to: email,
    from: process.env.EMAIL_FROM,
    subject: "Accommodation Booking Details 💜",
    html: `
      <h2>Hi ${name},</h2>
      <p>Thank you for booking accommodation.</p>
      <p><strong>Total Amount Due: R${total}</strong></p>

      <h3>Banking Details</h3>
      <p>
        Bank: FNB<br>
        Account Name: Dehan & Michaela<br>
        Account Number: 123456789<br>
        Branch Code: 250655<br>
        Reference: ${name} Wedding
      </p>

      <p>Please send proof of payment after EFT.</p>
      <p>We can't wait to celebrate with you! 💜</p>
    `
  };

  try {
    await Promise.all([
      sendEmail(adminMsg, "Accommodation Admin"),
      sendEmail(guestMsg, "Accommodation Guest")
    ]);

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Email failed." });
  }
});

// ============================
// Accommodation Page
// ============================
app.get('/payment', (req, res) => {
  res.send(`
  <html>
  <head>
    <title>Accommodation Booking</title>
    <style>
      body { background:#1a1a1a; color:#eee; font-family:Arial; text-align:center; padding:50px; }
      input { padding:10px; margin:10px; width:200px; }
      button { padding:12px 20px; background:#6f42c1; color:white; border:none; border-radius:8px; cursor:pointer; }
    </style>
  </head>
  <body>
    <h2>Accommodation Booking</h2>

    <input type="text" id="name" placeholder="Your Name"><br>
    <input type="email" id="email" placeholder="Your Email"><br>
    <input type="number" id="adults" placeholder="Adults (R500 each)" min="0"><br>
    <input type="number" id="kids" placeholder="Kids (R250 each)" min="0"><br>

    <h3 id="total">Total: R0</h3>

    <button onclick="submitBooking()">Confirm Booking</button>

    <script>
      const adultsInput = document.getElementById('adults');
      const kidsInput = document.getElementById('kids');
      const totalDisplay = document.getElementById('total');

      function updateTotal() {
        const adults = parseInt(adultsInput.value) || 0;
        const kids = parseInt(kidsInput.value) || 0;
        const total = (adults * 500) + (kids * 250);
        totalDisplay.innerText = "Total: R" + total;
      }

      adultsInput.addEventListener('input', updateTotal);
      kidsInput.addEventListener('input', updateTotal);

      async function submitBooking() {
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const adults = parseInt(adultsInput.value) || 0;
        const kids = parseInt(kidsInput.value) || 0;

        const response = await fetch('/api/accommodation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, adults, kids })
        });

        const data = await response.json();

        if (data.success) {
          alert("Booking confirmed! Check your email 💜");
        } else {
          alert("Something went wrong.");
        }
      }
    </script>
  </body>
  </html>
  `);
});

// ============================
// Start Server
// ============================
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
