import orderModel from "../models/orderModel.js"
import userModel from "../models/userModel.js";
 import Stripe from 'stripe';
 import razorpay from 'razorpay'


//global variables
const currency='inr';
const deliveryCharge = 10; // Assuming a fixed delivery charge, can be dynamic based on location

// gateway initialize
 const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const razorpayInstance = new razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret:process.env.RAZORPAY_KEY_SECRET
});
const placeOrder = async (req, res) => {
    try {
        const { userId, items, amount, address} = req.body
        const orderData = {
            userId,
            items,
            amount,
            address,
            paymentMethod: "COD",
            payment: false,
            date: Date.now()
        }
        const newOrder = new orderModel(orderData)
        await newOrder.save()

        await userModel.findByIdAndUpdate(userId, {cartData: {}})

        res.json({success: true, message: "Order Placed"})
    }
    catch (error){
        console.log(error)
        res.json({success: false, message: error.message})
    }
}

// Placing orders using stripe method
const placeOrderStripe = async (req, res) => {
  try {
    const { userId, items, amount, address } = req.body;
    const { origin } = req.headers;

    // Save order
    const orderData = {
      userId,
      items,
      address,
      amount,
      paymentMethod: "Stripe",
      payment: false,
      date: Date.now(),
    };

    const newOrder = new orderModel(orderData);
    await newOrder.save();

    // Create Stripe line_items
    const line_items = items.map(item => ({
      price_data: {
        currency: currency,
        product_data: {
          name: item.name,
        },
        unit_amount: item.price * 100, // Stripe expects amount in cents
      },
      quantity: item.quantity,
    }));

   // Optional: Add any extra item manually if needed
    line_items.push({
      price_data: {
        currency: currency,
        product_data: {
          name: "Delivery charges",
        },
        unit_amount: deliveryCharge * 100, // Assuming item.price is the delivery charge
      },
      quantity: 1, // Assuming quantity is 1 for delivery charge
    });

    //Example: create Stripe checkout session (needs Stripe initialized)
    const session = await stripe.checkout.sessions.create({
         success_url: `${origin}/verify?success=true&orderId=${newOrder._id}`,
         cancel_url: `${origin}/verify?success=false&orderId=${newOrder._id}`,
        line_items,
        mode: 'payment',
     
    });

     res.json({success: true,session_url: session.url});

  } catch (err) {
    console.error("Stripe Order Error:", err);
    res.status(500).json({ success: false, message: "Something went wrong", error: err.message });
  }
};

// verify stripe payment
const verifyStripe = async (req, res) => {

    const { orderId ,success,userId} = req.body;
      try {
        if(success===true || success==='true'){
            await orderModel.findByIdAndUpdate(orderId, {payment: true, status: "Placed"})
            await userModel.findByIdAndUpdate(userId, {cartData: {}})
            res.json({success: true, message: "Payment successful and order placed"});
        }
        else{
            await orderModel.findByIdAndDelete(orderId);
            res.json({success: false, message: "Payment failed or cancelled"});
        }
  }catch (err) {
    console.error("Stripe Order Error:", err);
    res.status(500).json({ success: false, message: "Something went wrong", error: err.message });
  }
}


// Placing orders using Razorpay method
const placeOrderRazorpay = async (req, res) => {
            try {
    const { userId, items, amount, address } = req.body;

    // Save order
    const orderData = {
      userId,
      items,
      address,
      amount,
      paymentMethod: "Razorpay",
      payment: false,
      date: Date.now(),
    };

    const newOrder = new orderModel(orderData);
    await newOrder.save();

      const options = {
        amount: amount * 100, 
        currency: currency.toUpperCase(),
        receipt:newOrder._id.toString()
      }
       await razorpayInstance.orders.create(options, (err, order) => {
             if(err) {
              console.log("Razorpay Order Error:", err);
              return res.json({ success: false, message: "Something went wrong", err});
             }
             res.json({ success: true,order})
       })

}   catch (err) {
    console.log("razorpay Order Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

const verifyRazorpay = async (req, res) => {
    try{
       const { userId, razorpay_order_id} = req.body;
       const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id);
       console.log(orderInfo);
        if(orderInfo.status === 'paid') {
          await orderModel.findByIdAndUpdate(orderInfo.receipt, {payment: true});
          await userModel.findByIdAndUpdate(userId, {cartData: {}});
          res.json({success: true, message: "Payment successful and order placed"});
        }else{
          res.json({success: false, message: "Payment failed or cancelled"});
        }
    } catch (err) {
    console.log("razorpay Order Error:", err);
  res.status(500).json({ success: false, message:err.message });
  }
}


// All orders data for admin panel
const allOrders = async (req, res) => {
    try{
        const orders = await orderModel.find({})
        res.json({success: true, orders})
    }
    catch(error){
        console.log(error)
        res.json({success: false, message: error.message})
    }
 }

// User order data for frontend
const userOrders = async (req, res) => {
    try{
        const {userId} = req.body
        const orders = await orderModel.find({userId})
        res.json({success: true, orders})
    }
    catch (error){
        console.log(error)
        res.json({success: false, message: error.message})
    }
}

// Update order status
const updateStatus = async (req, res) => {
    try{
        const {orderId, status} = req.body
        await orderModel.findByIdAndUpdate(orderId, {status})
        res.json({success: true, message: "Order Status Updated"})
    }
    catch (error){
        console.log(error)
        res.json({success: false, message: error.message})
    }
}

export {verifyRazorpay, verifyStripe ,placeOrder, placeOrderRazorpay, placeOrderStripe, allOrders, updateStatus, userOrders}