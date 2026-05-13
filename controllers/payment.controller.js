const prisma = require("../db/prismaClient");
const {
    validateCardFormat,
    fetchBinInfo,
} = require("../services/payment-checking.service");
const { fetchBooksByIds, calculateTotal, simulateRollback } =
    require("../services/price-calculator.service").default;
const { CardDto } = require("../dtos/CardDto");
const { CartDto } = require("../dtos/CartDto");
const { UserDto } = require("../dtos/UserDto");
const { z } = require("zod");

const PaymentRequestDto = UserDto.merge(CartDto).extend({ card: CardDto });

async function processPayment(req, res, next) {
    const parsed = PaymentRequestDto.safeParse(req.body);
    if (!parsed.success) {
        return res
            .status(422)
            .json({ errors: parsed.error.flatten().fieldErrors });
    }

    const { userId, firstName, lastName, bookIds, card, orderId } = parsed.data;

    const cardCheck = validateCardFormat(card);
    if (!cardCheck.valid) {
        return res.status(422).json({ error: cardCheck.reason });
    }

    const [binInfo, books] = await Promise.all([
        fetchBinInfo(card.number),
        Promise.resolve().then(() => fetchBooksByIds(bookIds)),
    ]).catch((err) => {
        throw err;
    });

    const total = calculateTotal(books);

    let payment;
    try {
        payment = await prisma.payment.create({
            data: { userId, orderId, status: "PENDING" },
        });
    } catch (createErr) {
        if (createErr.code === "P2002") {
            return res
                .status(409)
                .json({ error: "A payment for this orderId already exists" });
        }
        return next(createErr);
    }

    try {
        const [, invoice] = await prisma.$transaction([
            prisma.payment.update({
                where: { id: payment.id },
                data: { status: "VALIDATED" },
            }),
            prisma.invoice.create({
                data: {
                    paymentId: payment.id,
                    firstName,
                    lastName,
                    bookInvoices: {
                        createMany: {
                            data: books.map((b) => ({
                                title: b.title,
                                price: String(b.price),
                                quantity: b.quantity,
                            })),
                        },
                    },
                },
            }),
        ]);

        return res.status(201).json({
            orderId,
            status: "SUCCESS",
        });
    } catch (err) {
        await prisma.payment
            .update({
                where: { id: payment.id },
                data: { status: "FAILED" },
            })
            .catch(() => {});

        simulateRollback(books);
        return res.status(200).json({
            orderId,
            status: "FAILED",
        });
    }
}

module.exports = { processPayment };
