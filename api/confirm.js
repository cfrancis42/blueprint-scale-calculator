const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const jwt = require("jsonwebtoken");

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: "Missing session_id" });

    // Verify the Checkout Session in Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id, { expand: ["customer"] });
    if (session.payment_status !== "paid") {
      return res.status(400).json({ error: "Payment not completed" });
    }

    const email = session.customer_details?.email || session.customer?.email || "unknown@example.com";

    // Issue a token
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
