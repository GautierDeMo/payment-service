const invoiceService = require("../services/invoice.service");
const { generateInvoicePdf } = require("../services/invoice-pdf.service");

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
		res.setHeader("Content-Disposition", `attachment; filename="invoice-${invoiceId}.pdf"`);

		pdfDoc.pipe(res);
		pdfDoc.end();
	} catch (error) {
		res.status(404).json({
			success: false,
			message: error.message,
		});
	}
};

module.exports = {
	getInvoice,
	downloadInvoicePdf,
};
