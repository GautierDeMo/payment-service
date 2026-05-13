const prisma = require("../db/prismaClient");
const formatInvoice = require("../dtos/InvoiceDto");

const getInvoiceById = async (invoiceId) => {
	const invoice = await prisma.invoice.findUnique({
		where: { id: parseInt(invoiceId) },
		include: {
			bookInvoices: true,
			payment: true,
		},
	});

	if (!invoice) {
		throw new Error("Facture non trouvée");
	}

	return formatInvoice(invoice);
};

module.exports = {
	getInvoiceById,
};
