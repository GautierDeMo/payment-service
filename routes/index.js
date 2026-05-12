const express = require("express");
const router = express.Router();
const { getInvoice, downloadInvoicePdf } = require("../controllers/payment.controller");

/* GET home page. */
router.get("/", function (req, res, next) {
	res.render("index", { title: "Express" });
});

/* GET invoice by ID */
router.get("/invoices/:id", getInvoice);

/* GET invoice PDF by ID */
router.get("/invoices/:id/pdf", downloadInvoicePdf);

module.exports = router;
