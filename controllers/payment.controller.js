const prisma = require("../db/prismaClient");
const {
    validateCardFormat,
    fetchBinInfo,
} = require("../services/payment-checking.service");
const {
    fetchBooksByIds,
    calculateTotal,
    simulateRollback,
} = require("../services/price-calculator.service");
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

    const { userId, firstName, lastName, bookIds, card } = parsed.data;

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

    const payment = await prisma.payment.create({
        data: { userId, status: "PENDING" },
    });

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
            status: "VALIDATED",
            invoiceId: invoice.id,
            total: parseFloat(total.toFixed(2)),
            card: binInfo
                ? {
                      brand: binInfo.scheme || binInfo.brand || null,
                      type: binInfo.type || null,
                      country: binInfo.country
                          ? binInfo.country.name || binInfo.country.alpha2
                          : null,
                      bank: binInfo.bank ? binInfo.bank.name : null,
                  }
                : null,
        });
    } catch (err) {
        await prisma.payment
            .update({
                where: { id: payment.id },
                data: { status: "FAILED" },
            })
            .catch(() => {});

        simulateRollback(books);
        next(err);
    }
}

module.exports = { processPayment };
