// import { loadStripe } from '@stripe/stripe-js';

export const formatMoney = nominal => {
  if (!nominal) return "0"
  nominal = Number(nominal)
  let result = ""
  let counter = 0
  while (nominal > 0) {
    if (counter > 0 && counter % 3 == 0) {
      result = "," + result
    }
    result = String(nominal % 10) + result
    nominal = Math.floor(nominal / 10)
    counter += 1
  }
  return result
}

// let stripePromise;
// const getStripe = () => {
//   if (!stripePromise) {
//     stripePromise = loadStripe(process.env.GATSBY_STRIPE_PUBLISHABLE_KEY);
//   }
//   return stripePromise;
// };

// export default getStripe;