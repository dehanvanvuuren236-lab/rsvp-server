require('dotenv').config({ debug: true });
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
// Accommodation Page (Dynamic EFT Flow)
// ============================
app.get('/payment', (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accommodation Booking | Dehan & Michaela</title>
    <style>
      body { background:#1a1a1a; color:#eee; font-family:Arial, sans-serif; text-align:center; padding:50px; }
      input { padding:10px; margin:10px 0; width:250px; border-radius:6px; border:1px solid #555; }
      button { padding:12px 20px; background:#6f42c1; color:white; border:none; border-radius:8px; cursor:pointer; }
      button:hover { background:#8a5fd1; }
      .total { font-size:20px; margin:15px 0; color:#c85a9e; }
      .bank-details { background:#222; padding:20px; border-radius:10px; margin-top:20px; display:none; text-align:left; width:300px; margin-left:auto; margin-right:auto; }
      .bank-details p { margin:6px 0; }
    </style>
  </head>
  <body>
    <h2>Accommodation Booking</h2>
    <p>Enter your details to see banking info and total amount.</p>

    <input type="text" id="name" placeholder="Your Name">
    <input type="email" id="email" placeholder="Your Email">
    <input type="number" id="adults" placeholder="Adults (R500 each)" min="0" value="0">
    <input type="number" id="kids" placeholder="Kids (R250 each)" min="0" value="0">

    <div class="total" id="total">Total: R0</div>

    <button id="submitBtn">Confirm Booking & View Banking Details</button>

    <div class="bank-details" id="bankDetails">
      <h3>Banking Details</h3>
      <p><strong>Bank:</strong> FNB</p>
      <p><strong>Account Name:</strong> Dehan & Michaela</p>
      <p><strong>Account Number:</strong> 123456789</p>
      <p><strong>Branch Code:</strong> 250655</p>
      <p><strong>Reference:</strong> <span id="bankRef"></span></p>
      <p>Please send proof of payment after EFT. 💜</p>
    </div>

    <script>
      const adultsInput = document.getElementById('adults');
      const kidsInput = document.getElementById('kids');
      const totalDisplay = document.getElementById('total');
      const bankDetails = document.getElementById('bankDetails');
      const bankRef = document.getElementById('bankRef');
      const submitBtn = document.getElementById('submitBtn');

      function updateTotal() {
        const adults = parseInt(adultsInput.value) || 0;
        const kids = parseInt(kidsInput.value) || 0;
        const total = (adults * 500) + (kids * 250);
        totalDisplay.innerText = "Total: R" + total;
      }

      adultsInput.addEventListener('input', updateTotal);
      kidsInput.addEventListener('input', updateTotal);
      updateTotal();

      submitBtn.addEventListener('click', async () => {
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const adults = parseInt(adultsInput.value) || 0;
        const kids = parseInt(kidsInput.value) || 0;

        if (!name || !email || (adults + kids) === 0) {
          alert("Please enter all details and at least 1 guest.");
          return;
        }

        try {
          const res = await fetch('/api/accommodation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, adults, kids })
          });

          const data = await res.json();
          if (data.success) {
            // Show bank details dynamically
            bankRef.innerText = name + " Wedding";
            bankDetails.style.display = 'block';
            submitBtn.disabled = true;
            submitBtn.innerText = "Booking Confirmed!";
            alert("Booking confirmed! Check your email 💜");
          } else {
            alert(data.error || "Something went wrong.");
          }
        } catch (err) {
          console.error(err);
          alert("Failed to submit booking. Try again.");
        }
      });
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
