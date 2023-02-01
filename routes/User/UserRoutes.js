var express = require('express');
var router = express.Router()
const UserController = require('../../controllers/User/UserController');



//---------------------------------------------Transactions Controller---------------------------------------------------------------------------------
router.post('/stripe-weebhook',  UserController.stripeWebHook);
router.get('/get-transactions',  UserController.getAllTransactions);
router.get('/export-transactions',  UserController.exportAllTransactions);



module.exports = router

















