const express = require('express');
const router = express.Router();
const { processPayment } = require('../controllers/payment.controller');
const requireAuth = require('../middlewares/auth.middleware');

router.post('/', requireAuth, processPayment);

module.exports = router;
