require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sgMail = require('@sendgrid/mail');
const axios = require('axios');
const qs = require('querystring');

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
app.use(express.urlencoded({ extended: true })); // Needed for PayFast IPN

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

if (!process.env.PAYFAST_MERCHANT_ID || !process.env.PAYFAST_MERCHANT_KEY) {
  console.warn("❌ Missing PAYFAST credentials! Payments will not work.");
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
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const { adults = 0, kids = 0 } = guests;
  const nameList = Array.isArray(names) ? names.join(', ') : names;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  // Admin email
  const adminMsg = {
    to: process.env.EMAIL_FROM,
    from: { email: process.env.EMAIL_FROM, name: "Dehan & Michaela Wedding" },
    replyTo: email,
    subject: `New RSVP from ${nameList}`,
    html: `
      <div style="font-family:'Arial', sans-serif; padding:20px; background:#fff; border-radius:8px;">
        <h2 style="color:#6f42c1;">New RSVP Received</h2>
        <p><strong>Names:</strong> ${nameList}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Adults:</strong> ${adults}</p>
        <p><strong>Children:</strong> ${kids}</p>
      </div>`
  };

  // Guest confirmation email
  const userMsg = {
    to: email,
    from: { email: process.env.EMAIL_FROM, name: "Dehan & Michaela Wedding" },
    replyTo: process.env.EMAIL_FROM,
    subject: "Your RSVP is Confirmed",
    html: `
      <div style="font-family:'Arial', sans-serif; background:#f8f2fc; padding:30px; border-radius:14px; text-align:center; color:#2f2f2f;">
        <h2 style="color:#6f42c1;">Hi ${nameList},</h2>
        <p>Thank you for RSVPing! We’ve recorded <strong>${adults}</strong> adult(s) and <strong>${kids}</strong> child(ren).</p>
        <p>We look forward to celebrating with you on <strong>16 May 2026</strong> at <strong>Rustic Gem Venue, Cullinan</strong>.</p>
        <div style="margin:30px auto; width:90%; max-width:400px; padding:15px; background:#fff; border-radius:12px; border:2px solid #6f42c169; box-shadow:0 0 15px #6f42c144;">
          <p><strong style="color:#6f42c1;">Your RSVP has been recorded</strong></p>
        </div>
        <p>With love,<br><strong>Dehan & Michaela</strong></p>
      </div>`
  };

  try {
    await Promise.all([
      sendEmail(adminMsg, 'Admin'),
      sendEmail(userMsg, 'Guest Confirmation')
    ]);
    res.status(200).json({ message: 'RSVP and confirmation email sent successfully.' });
  } catch (err) {
    console.error("❌ Email error:", err);
    res.status(500).json({ error: 'Failed to send one or more emails.' });
  }
});

// ============================
// PayFast IPN Endpoint
// ============================
app.post('/api/payment/ipn', async (req, res) => {
  const data = req.body;

  try {
    // Verify with PayFast (sandbox or live)
    const verifyUrl = process.env.PAYFAST_SANDBOX === 'true'
      ? 'https://sandbox.payfast.co.za/eng/query/validate'
      : 'https://www.payfast.co.za/eng/query/validate';

    const verifyRes = await axios.post(verifyUrl, qs.stringify(data));

    if (verifyRes.data === 'VALID') {
      console.log('✅ Payment verified:', data);

      // Send confirmation email to guest
      if (data.email_address) {
        const payMsg = {
          to: data.email_address,
          from: { email: process.env.EMAIL_FROM, name: "Dehan & Michaela Wedding" },
          subject: "Payment Received ✅",
          html: `
            <div style="font-family:'Arial', sans-serif; background:#f3e8fc; padding:30px; border-radius:14px; text-align:center;">
              <h2 style="color:#6f42c1;">Hi ${data.item_name || 'Guest'},</h2>
              <p>We’ve received your payment of <strong>R${data.amount_gross}</strong> for accommodation.</p>
              <p>Thank you! We can’t wait to celebrate with you on <strong>16 May 2026</strong>.</p>
              <p>With love,<br><strong>Dehan & Michaela</strong></p>
            </div>`
        };
        await sendEmail(payMsg, 'Guest Payment Confirmation');
      }

      res.status(200).send('OK');
    } else {
      console.warn('❌ Payment verification failed:', data);
      res.status(400).send('Invalid');
    }
  } catch (err) {
    console.error('❌ IPN verification error:', err);
    res.status(500).send('Error');
  }
});

// ============================
// Dynamic Payment Page
// ============================
app.get('/payment', (req, res) => {
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accommodation Payment | Dehan & Michaela Wedding</title>
    <style>
      body { background:#1a1a1a; color:#eee; font-family:"Merriweather", serif; margin:0; }
      .payment-section { padding:80px 20px; display:flex; justify-content:center; align-items:center; min-height:100vh; }
      .payment-box { background: rgba(0,0,0,0.85); padding:40px; border-radius:16px; max-width:500px; width:100%; box-shadow:0 0 30px rgba(111,66,193,0.7); text-align:center; }
      .payment-box h2 { font-family:"Great Vibes", cursive; font-size:36px; color:#c85a9e; margin-bottom:20px; }
      .payment-box p, .payment-box label { font-size:16px; margin-bottom:15px; }
      .payment-box input { width:100%; padding:12px; margin-bottom:20px; border-radius:8px; border:1px solid rgba(184,169,201,0.5); font-size:16px; }
      .rsvp-btn { background:#6f42c1; color:#fff; font-family:"Playfair Display", serif; font-size:18px; padding:12px 0; border-radius:12px; border:none; cursor:pointer; box-shadow:0 0 15px rgba(111,66,193,0.6); transition:all 0.3s ease; }
      .rsvp-btn:hover { background:#b89ac9; box-shadow:0 0 25px rgba(184,169,201,0.7); }
      .payment-note { font-size:14px; margin-top:15px; color:#ccc; }
      .total-amount { font-size:20px; font-weight:bold; color:#c85a9e; margin-bottom:15px; }
    </style>
  </head>
  <body>
    <section class="payment-section">
      <div class="payment-box">
        <h2>Accommodation Payment</h2>
        <p>Secure your accommodation for the wedding weekend by paying below.</p>

        <form id="payfastForm" action="https://${process.env.PAYFAST_SANDBOX === 'true' ? 'sandbox.' : ''}payfast.co.za/eng/process" method="POST" target="_blank">
          <input type="hidden" name="merchant_id" value="${process.env.PAYFAST_MERCHANT_ID}">
          <input type="hidden" name="merchant_key" value="${process.env.PAYFAST_MERCHANT_KEY}">
          <input type="hidden" name="return_url" value="${process.env.DOMAIN}/success.html">
          <input type="hidden" name="cancel_url" value="${process.env.DOMAIN}/cancel.html">
          <input type="hidden" name="notify_url" value="${process.env.DOMAIN}/api/payment/ipn">
          <input type="hidden" name="amount" id="amount" value="">

          <label for="item_name">Your Name / Reference</label>
          <input type="text" id="item_name" name="item_name" placeholder="Family Name" required>

          <label>Number of Adults (R500 each)</label>
          <input type="number" id="adults" min="0" value="0" required>

          <label>Number of Children (R250 each)</label>
          <input type="number" id="kids" min="0" value="0" required>

          <div class="total-amount" id="totalDisplay">Total: R0</div>

          <button type="submit" class="rsvp-btn">Pay Now</button>
        </form>

        <p class="payment-note">Please check your email for confirmation. If you don’t see it, check your spam folder 💜</p>
      </div>
    </section>

    <script>
      const adultsInput = document.getElementById('adults');
      const kidsInput = document.getElementById('kids');
      const totalDisplay = document.getElementById('totalDisplay');
      const amountField = document.getElementById('amount');

      function updateTotal() {
        const adults = parseInt(adultsInput.value) || 0;
        const kids = parseInt(kidsInput.value) || 0;
        const total = (adults * 500) + (kids * 250);
        totalDisplay.textContent = 'Total: R' + total;
        amountField.value = total.toFixed(2);
      }

      adultsInput.addEventListener('input', updateTotal);
      kidsInput.addEventListener('input', updateTotal);
      updateTotal();
    </script>
  </body>
  </html>
  `;

  res.send(html);
});

// ============================
// Start Server
// ============================
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
