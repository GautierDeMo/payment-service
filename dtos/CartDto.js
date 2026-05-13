const { z } = require('zod');

const CartDto = z.object({
  orderId: z.string().uuid('orderId must be a valid UUID v4'),
  bookIds: z.array(z.number().int().positive()).min(1, 'At least one book is required'),
});

module.exports = { CartDto };
