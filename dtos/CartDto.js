const { z } = require('zod');

const CartDto = z.object({
  bookIds: z.array(z.number().int().positive()).min(1, 'At least one book is required'),
});

module.exports = { CartDto };
