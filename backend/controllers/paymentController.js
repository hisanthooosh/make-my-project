const Razorpay = require('razorpay');
const crypto = require('crypto');
const admin = require('firebase-admin');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// 1. Create an Order
const createOrder = async (req, res) => {
  try {
    const options = {
      amount: 2900, // Amount is in paise (29 INR * 100 = 2900 paise)
      currency: "INR",
      receipt: `receipt_${req.user.uid}`,
      notes: {
        userId: req.user.uid,
        userName: req.user.name
      }
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).send("Error creating order");
  }
};

// 2. Verify Payment & Unlock User
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    // Create the signature verification string
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    
    // Hash it using your secret
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      // --- SUCCESS: UPDATE DATABASE ---
      const db = admin.firestore();
      
      // Update the user document to set isPaid = true
      await db.collection('users').doc(req.user.uid).update({
        isPaid: true,
        paymentId: razorpay_payment_id,
        paidAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.status(200).json({ success: true, message: "Payment verified successfully" });
    } else {
      res.status(400).json({ success: false, message: "Invalid signature" });
    }
  } catch (error) {
    console.error("Payment verification failed:", error);
    res.status(500).json({ success: false, message: "Server error during verification" });
  }
};

module.exports = { createOrder, verifyPayment };