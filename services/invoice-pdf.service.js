const PDFDocument = require("pdfkit");
const invoiceService = require("./invoice.service");

const generateInvoicePdf = async (invoiceId) => {
	const invoice = await invoiceService.getInvoiceById(invoiceId);

	const doc = new PDFDocument();

	// Title
	doc.fontSize(20).font("Helvetica-Bold").text("FACTURE", { align: "center" });
	doc.moveDown();

	// Num & date
	doc.fontSize(12).font("Helvetica");
	doc.text(`Facture n°: ${invoice.id}`, 50);
	doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString("fr-FR")}`);
	doc.moveDown();

	// Client details
	doc.font("Helvetica-Bold").text("CLIENT", 50);
	doc.font("Helvetica");
	doc.text(`${invoice.firstName} ${invoice.lastName}`, 50);
	doc.moveDown();

	// Articles board
	doc.font("Helvetica-Bold").fontSize(11);
	const tableTop = doc.y;
	doc.text("Désignation", 50);
	doc.text("Quantité", 300);
	doc.text("Prix unitaire", 380);
	doc.text("Total", 470);
	doc.moveTo(50, tableTop + 20)
		.lineTo(550, tableTop + 20)
		.stroke();
	doc.moveDown();

	// Articles
	let totalAmount = 0;
	doc.font("Helvetica").fontSize(10);

	invoice.bookInvoices.forEach((book) => {
		const lineTotal = parseFloat(book.price) * book.quantity;
		totalAmount += lineTotal;

		doc.text(book.title, 50);
		doc.text(book.quantity, 300);
		doc.text(`${book.price} €`, 380);
		doc.text(`${lineTotal.toFixed(2)} €`, 470);
		doc.moveDown();
	});

	doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
	doc.moveDown();

	// Total
	doc.font("Helvetica-Bold").fontSize(12);
	doc.text(`Total: ${totalAmount.toFixed(2)} €`, 400);

	return doc;
};

module.exports = {
	generateInvoicePdf,
};
