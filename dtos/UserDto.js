const { z } = require('zod');

const UserDto = z.object({
  userId:    z.number().int().positive(),
  firstName: z.string().min(1).max(100),
  lastName:  z.string().min(1).max(100),
});

module.exports = { UserDto };
