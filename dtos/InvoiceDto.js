const formatInvoice = (invoice) => {
	return {
		id: invoice.id,
		firstName: invoice.firstName,
		lastName: invoice.lastName,
		createdAt: invoice.createdAt,
		paymentId: invoice.paymentId,
		bookInvoices: invoice.bookInvoices || [],
	};
};

module.exports = formatInvoice;
