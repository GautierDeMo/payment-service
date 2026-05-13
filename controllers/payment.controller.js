const prisma = require("../db/prismaClient");
const invoiceService = require("../services/invoice.service");
const { generateInvoicePdf } = require("../services/invoice-pdf.service");
const { PaymentRequestDto } = require("../dtos/CartDto");
const {
    validateCardFormat,
    fetchBinInfo,
} = require("../services/payment-checking.service");

const getInvoice = async (req, res) => {
    try {
        const invoiceId = req.params.id;
        const invoice = await invoiceService.getInvoiceById(invoiceId);

        res.json({
            success: true,
            data: invoice,
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message,
        });
    }
};

const downloadInvoicePdf = async (req, res) => {
    try {
        const invoiceId = req.params.id;
        const pdfDoc = await generateInvoicePdf(invoiceId);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="invoice-${invoiceId}.pdf"`,
        );

        pdfDoc.pipe(res);
        pdfDoc.end();
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message,
        });
    }
};

async function processPayment(req, res, next) {
    const parsed = PaymentRequestDto.safeParse(req.body);
    if (!parsed.success) {
        return res
            .status(422)
            .json({ errors: parsed.error.flatten().fieldErrors });
    }

    const { orderId, cart, total, card } = parsed.data;
    const userId = parseInt(req.user.id);

    const cardCheck = validateCardFormat(card);
    if (!cardCheck.valid) {
        return res.status(422).json({ error: cardCheck.reason });
    }

    const binInfo = await fetchBinInfo(card.number);

    let payment;
    try {
        payment = await prisma.payment.create({
            data: { userId, orderId, status: "RESERVED" },
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
        await prisma.$transaction([
            prisma.payment.update({
                where: { id: payment.id },
                data: { status: "VALIDATED" },
            }),
            prisma.invoice.create({
                data: {
                    paymentId: payment.id,
                    bookInvoices: {
                        createMany: {
                            data: cart.map((item) => ({
                                title: item.title,
                                price: String(item.price),
                                quantity: item.quantity,
                            })),
                        },
                    },
                },
            }),
        ]);

        return res.status(201).json({
            orderId,
            status: "SUCCESS",
            total,
        });
    } catch (err) {
        await prisma.payment
            .update({
                where: { id: payment.id },
                data: { status: "FAILED" },
            })
            .catch(() => {});

        return res.status(200).json({
            orderId,
            status: "FAILED",
        });
    }
}

module.exports = {
    getInvoice,
    downloadInvoicePdf,
    processPayment,
};
