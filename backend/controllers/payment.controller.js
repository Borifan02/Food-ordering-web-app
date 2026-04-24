import Stripe from "stripe";
import logger from "../utils/logger.js";

let stripeClient = null;

const getStripeClient = () => {
  if (stripeClient) return stripeClient;

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return null;
  }

  stripeClient = new Stripe(stripeSecret);
  return stripeClient;
};

export const createPaymentIntent = async (req, res) => {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return res.status(503).json({
        message: "Payments are not configured on the server. Add STRIPE_SECRET_KEY to backend/.env."
      });
    }

    const { amount, currency = 'usd' } = req.body;
    
    // Validate amount
    if (!amount) {
      return res.status(400).json({ message: "Amount is required" });
    }
    
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ message: "Amount must be a positive number" });
    }
    
    if (amount < 0.50) {
      return res.status(400).json({ message: "Minimum amount is $0.50" });
    }
    
    if (amount > 999999.99) {
      return res.status(400).json({ message: "Maximum amount is $999,999.99" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId: req.user.id
      }
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    logger.error("Payment intent error:", error);
    res.status(500).json({ 
      message: "Payment processing failed",
      error: error.message 
    });
  }
};

export const confirmPayment = async (req, res) => {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return res.status(503).json({
        message: "Payments are not configured on the server. Add STRIPE_SECRET_KEY to backend/.env."
      });
    }

    const { paymentIntentId } = req.body;
    
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
      res.status(200).json({ 
        success: true, 
        message: "Payment confirmed",
        amount: paymentIntent.amount / 100
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: "Payment not completed" 
      });
    }
  } catch (error) {
    logger.error("Payment confirmation error:", error);
    res.status(500).json({ message: "Payment confirmation failed" });
  }
};