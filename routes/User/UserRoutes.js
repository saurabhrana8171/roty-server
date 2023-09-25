var express = require('express');
var router = express.Router()
const UserController = require('../../controllers/User/UserController');



//---------------------------------------------Transactions Controller---------------------------------------------------------------------------------

router.post('/create-paymenlink', UserController.createPaymentLink);
router.post('/create-subscriptions-webhook', UserController.createSubscriptionWebhook);
router.post('/cancel-subscription', UserController.cancelSuscription);
router.get('/get-subscription-details', UserController.getSuscription);
router.post('/subscription-update-webhook', UserController.subscriptionUpdate);



router.post('/stripe-weebhook', UserController.stripeWebHook);
router.get('/get-transactions', UserController.getAllTransactions);
router.get('/export-transactions', UserController.exportAllTransactions);





// router.post('/invoice_payment_failed',  UserController.invoice_payment_failed);
router.get('/get-auto-payments-status', UserController.getSubAutoRenewalDetails);


module.exports = router

















