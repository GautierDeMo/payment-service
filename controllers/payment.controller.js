const invoiceService = require("../services/invoice.service");

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

module.exports = {
	getInvoice,
};
