const stripe = require('stripe')(process.env.GATSBY_STRIPE_SECRET_KEY);

// Docs on event and context https://docs.netlify.com/functions/build-with-javascript/
exports.handler = async (event, context) => {
  const { order } = JSON.parse(event.body);
  const {
    name,
    email,
    contact_number,
    event_date,
    location,
    setup_time,
    pack_down_time,
    message,
    additional_notes,
    diy_option
  } = order;
  
  const eventDate = new Date(event_date)
  const todayDate = new Date()
  todayDate.setDate(todayDate.getDate() + 14);
  let discount = 0
  if (todayDate < eventDate && !diy_option) {
      discount = 0.1
  }
  const messageLetters = message?.replace(/ /g,'')
  const letters = messageLetters ? messageLetters.length : 0
  const letterCost = diy_option ? letters * 100 : (letters <= 3 ? 450 : letters * 150)
  const discounted = letterCost * discount
  const subtotal =  letterCost - discounted
  const gst = subtotal * 0.1
  const totalPayment = Math.round(subtotal + gst)

  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalPayment,
    currency: "usd",
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

  return {
    statusCode: 200,
    body: JSON.stringify({
      paymentIntent: paymentIntent,
      publishableKey: process.env.GATSBY_STRIPE_PUBLISHABLE_KEY,
    }),
  };
}
