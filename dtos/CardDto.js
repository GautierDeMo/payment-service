const { z } = require('zod');

const CardDto = z.object({
    number: z.string().regex(/^\d{12,19}$/, 'Card number must be 12-19 digits'),
    expiryMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, 'Expiry month must be MM format'),
    expiryYear: z.string().regex(/^\d{4}$/, 'Expiry year must be YYYY format'),
    cvv: z.string().regex(/^\d{3,4}$/, 'CVV must be 3 or 4 digits'),
    holderName: z.string().min(2).max(100),
});

module.exports = { CardDto };
