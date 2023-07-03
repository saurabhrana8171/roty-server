var express = require('express');
var router = express.Router()
const UserController = require('../../controllers/User/UserController');



//---------------------------------------------Transactions Controller---------------------------------------------------------------------------------
router.post('/stripe-weebhook',  UserController.stripeWebHook);
router.get('/get-transactions',  UserController.getAllTransactions);
router.get('/export-transactions',  UserController.exportAllTransactions);
router.post('/create-paymenlink',  UserController.createPaymentLink);
router.post('/cancel-subscription',  UserController.cancelSuscription);
router.get('/get-subscription-details',  UserController.getSuscription);
router.post('/payment-failed',  UserController.subscriptionUpdate);
router.post('/invoice_payment_failed',  UserController.invoice_payment_failed);


module.exports = router

    















