const stripe = require('stripe')(process.env.GATSBY_STRIPE_SECRET_KEY);

// Docs on event and context https://docs.netlify.com/functions/build-with-javascript/
exports.handler = async (event, context) => {
  const { order, paymentMethod } = JSON.parse(event.body);
  const {
    name,
    email,
    contact_number,
    event_date,
    location,
    setup_time,
    pack_down_time,
    message,
    additional_notes
  } = order;

  const messageLetters = message?.replace(/ /g,'');
  const letters = messageLetters ? messageLetters.length : 0;
  const subtotal = letters <= 3 ? 450 : letters * 150;
  const totalPayment = Math.round(subtotal * 1.1) * 100;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalPayment,
    currency: 'usd',
    payment_method: paymentMethod.id,
    metadata: {
      "Customer Name": name,
      "Customer Email": email,
      "Contact Number": contact_number,
      "Event Date": event_date,
      "Location": location,
      "Setup Time": setup_time,
      "Pack Down Time": pack_down_time,
      "Message": message,
      "Additional Notes": additional_notes
    }
  });

  const charge = await stripe.charges.create({
    amount: totalPayment,
    currency: 'usd',
    source: paymentIntent.id
  });

  // const session = await stripe.checkout.sessions.create({
  //   customer_email: email,
  //   payment_method_types: ['card'],
  //   line_items: [
  //     {
  //       price_data: {
  //         currency: 'usd',
  //         product_data: {
  //           name: "Glow Letters",
  //           images: [`${process.env.GATSBY_PAYMENT_URL}/images/breath.jpg`],
            // metadata: {
            //   "Customer Name": name,
            //   "Contact Number": contact_number,
            //   "Event Date": event_date,
            //   "Location": location,
            //   "Setup Time": setup_time,
            //   "Pack Down Time": pack_down_time,
            //   "Message": message,
            //   "Additional Notes": additional_notes
            // }
  //         },
  //         unit_amount: totalPayment,
  //       },
  //       quantity: 1,
  //     },
  //   ],
  //   mode: 'payment',
  //   success_url: `${process.env.GATSBY_PAYMENT_URL}/thank-you/`,
  //   cancel_url: `${process.env.GATSBY_PAYMENT_URL}/general-enquiries/`,
  // });

  return {
    statusCode: 200,
    body: JSON.stringify({
      charge: charge,
      publishableKey: process.env.GATSBY_STRIPE_PUBLISHABLE_KEY,
    }),
  };
}
