/*
 * Various helper functions used throughout the project.
 */


// Add 31 days to the supplied date.
export function addMonth (date) {
 return new Date(date.setMonth(date.getMonth()+1));
}


// Returns true if user has not subscribed before and payment is subscription type.
export function newSubscriber (alreadySubbed, paymentType) {
  return !alreadySubbed && (paymentType === "join" || paymentType === "watch");
}


// Generate the document name for the Firestore charts collection this month.
export function currentMonthKey () {
  const now = new Date();
  const year = now.getFullYear().toString();
  let month = (now.getMonth() + 1).toString();
  if (month.length === 1) month = "0" + month;
  return `${year}-${month}`;
}
