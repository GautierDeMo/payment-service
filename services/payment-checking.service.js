const cardValidator = require('card-validator');
const binlookup = require('binlookup');

const lookup = binlookup();

function validateCardFormat(card) {
  const numberResult = cardValidator.number(card.number);
  if (!numberResult.isValid) {
    return { valid: false, reason: 'Invalid card number (failed format or Luhn check)' };
  }

  const expiryResult = cardValidator.expirationDate({
    month: card.expiryMonth,
    year:  card.expiryYear,
  });
  if (!expiryResult.isValid) {
    return { valid: false, reason: 'Card is expired or expiry date is invalid' };
  }

  const cvvLength = numberResult.card ? numberResult.card.code.size : 3;
  const cvvResult = cardValidator.cvv(card.cvv, cvvLength);
  if (!cvvResult.isValid) {
    return { valid: false, reason: 'Invalid CVV' };
  }

  return { valid: true, cardType: numberResult.card };
}

async function fetchBinInfo(cardNumber) {
  try {
    const binData = await lookup(cardNumber);
    return binData || null;
  } catch (err) {
    console.warn('[BINLookup] External API unavailable, continuing without BIN data:', err.message);
    return null;
  }
}

module.exports = { validateCardFormat, fetchBinInfo };
