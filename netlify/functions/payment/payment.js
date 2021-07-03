const stripe = require('stripe')(process.env.GATSBY_STRIPE_SECRET_KEY);

// Docs on event and context https://www.netlify.com/docs/functions/#the-handler-method
const handler = async (event) => {
  const { order } = JSON.parse(event.body);

  const letters = order.message ? order.message.length : 0
  const subtotal = letters <= 3 ? 450 : letters * 150
  const totalPayment = subtotal * 1.1

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            ...order
          },
          unit_amount: totalPayment,
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.GATSBY_PAYMENT_URL}/thank-you/`,
    cancel_url: `${process.env.GATSBY_PAYMENT_URL}/general-enquiries/`,
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      sessionId: session.id,
      publishableKey: process.env.GATSBY_STRIPE_PUBLISHABLE_KEY,
    }),
  };
}

module.exports = { handler }
