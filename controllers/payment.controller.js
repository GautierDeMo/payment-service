const prisma = require("../db/prismaClient");
const invoiceService = require("../services/invoice.service");
const { generateInvoicePdf } = require("../services/invoice-pdf.service");
const {
    validateCardFormat,
    fetchBinInfo,
} = require("../services/payment-checking.service");
const { fetchBooksByIds, calculateTotal, simulateRollback } =
    require("../services/price-calculator.service").default;
const { CardDto } = require("../dtos/CardDto");
const { CartDto } = require("../dtos/CartDto");
const { UserDto } = require("../dtos/UserDto");
const PaymentRequestDto = UserDto.merge(CartDto).extend({ card: CardDto });
const { PaymentRequestDto } = require("../dtos/CartDto");

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

    const { orderId, cart, token } = parsed.data;

    let userId;
    try {
        const base64 = token
            .split(".")[1]
            .replace(/-/g, "+")
            .replace(/_/g, "/");
        const payload = JSON.parse(
            Buffer.from(base64, "base64").toString("utf8"),
        );
        userId = parseInt(payload.sub ?? payload.userId ?? payload.id);
        if (!userId || isNaN(userId)) throw new Error();
    } catch {
        return res
            .status(401)
            .json({ error: "Invalid token: missing user identifier" });
    }

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
