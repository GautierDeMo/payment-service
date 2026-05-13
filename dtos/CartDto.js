const { z } = require("zod");
const { CardDto } = require("./CardDto");

const CartItemDto = z.object({
    bookId: z.number().int().positive(),
    title: z.string().min(1),
    price: z.number().positive(),
    quantity: z.number().int().positive(),
});

const PaymentRequestDto = z.object({
    orderId: z.string().uuid("orderId must be a valid UUID v4"),
    cart: z.array(CartItemDto).min(1, "Cart must contain at least one item"),
    total: z.number().positive(),
    card: CardDto,
});

module.exports = { PaymentRequestDto };
