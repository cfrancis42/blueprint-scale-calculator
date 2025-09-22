// /api/confirm.js
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const jwt = require("jsonwebtoken");

// (optional) lock CORS to your site
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

module.exports = async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: "Missing session_id" });

    // Verify the Stripe Checkout session is paid
    const session = await stripe.checkout.sessions.retrieve(session_id, { expand: ["customer"] });
    if (session.payment_status !== "paid") {
      return res.status(400).json({ error: "Payment not completed" });
    }

    // Get customer email (best for “restore purchases” later)
    const email = session.customer_details?.email || session.customer?.email || "unknown@example.com";

    // TODO (optional): save {email, session.id, created} in a DB if you want restore via email later

    // Issue a long-lived entitlement token (JWT)
    const token = jwt.sign(
      { sub: email, scope: "all_scales" },
      process.env.JWT_SECRET,
      { expiresIn: "5y" }
    );

    res.json({ token });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};
