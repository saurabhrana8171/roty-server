const TransactionModel = require('../../models/TransactionModel');
const CustomersModel = require('../../models/CustomersModel');
const Helper = require('../../config/helper');
const stripePayment = require('../../config/stripe');
const stripkey = process.env.stripe
const stripe = require('stripe')(stripkey);
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');
const firebaseConfig = {
  apiKey: process.env.firebaseApiKey,
  authDomain: process.env.firebaseAuthDomain,
  projectId: process.env.firebaseProjectId,
  storageBucket: process.env.firebaseStorageBucket,
  messagingSenderId: process.env.firebaseMessagingSenderId,
  appId: process.env.firebaseAppId,
  measurementId: process.env.firebaseMeasurementId
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);





module.exports = {

  stripeWebHook: async (req, res) => {
    try {

      console.log("hhi")
      // const paymentIntent = await stripe.paymentIntents.retrieve(req.body.data.object.id);
      var paymentIntent = req.body.data.object
      var collection = 'users'
      var collectionDocId = req.body.data.object.metadata.collectionDocId
      var alreadyExixts = await TransactionModel.exists({ txn: req.body.data.object.id })
      // if (alreadyExixts) {
      //   console.log("This pi alrady exixts in database")
      //   return Helper.response(res, 422, "This is  pi already exixts in database");
      // }
      if (paymentIntent) {
        var transactionsDetails = {
          mobileNumber: req.body.data.object.metadata.mobileNumber ? req.body.data.object.metadata.mobileNumber : '',
          firstName: req.body.data.object.metadata.firstName ? req.body.data.object.metadata.firstName : '',
          lastName: req.body.data.object.metadata.lastName ? req.body.data.object.metadata.lastName : '',
          email: req.body.data.object.metadata.email ? req.body.data.object.metadata.email : '',
          txn: paymentIntent.id,
          date: new Date(paymentIntent.created * 1000),
          status: paymentIntent.status,
          amount: paymentIntent.plan.amount / 100
        }

        transactionsDetails.fullname = transactionsDetails.firstName + transactionsDetails.lastName.split(/\s/).join('')
        transactionsDetails.fullname = transactionsDetails.fullname.split(/\s/).join('')
        var savetransaction = await new TransactionModel(transactionsDetails).save()

        if (req.body.data) {
          var data = {
            subscriptionId: req.body.data.object.id,
            renewal_date: req.body.data.object.current_period_end,
            status: "active"

          }
        }
        if (collectionDocId) {
          await updateFirebaseCollectionDoc('users', collectionDocId, data)
        }

        return Helper.response(res, 200, " Save transactions");

      } else {
        return Helper.response(res, 422, "wrong Pi");
      }
    } catch (err) {
      console.log(err)
      return Helper.response(res, 500, " Server error.", { err });
    }
  },

  getAllTransactions: async (req, res) => {
    try {

      const limit = req.query.limit ? parseInt(req.query.limit) : 999;
      const page = req.query.page ? parseInt(req.query.page) : 1;
      var searchObj = await createSerachObj(req)
      var total = await TransactionModel.find(searchObj).count()
      var result = await TransactionModel.find(searchObj).lean()
        .sort({ _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
      var List = await Helper.pagination(total, page, limit)
      List.data = result
      if (!List.data) {
        return Helper.response(res, 200, "No Transactions Found");
      } else {
        return Helper.response(res, 200, "Transactions List", { List });
      }

    } catch (err) {
      console.log(err)
      return Helper.response(res, 500, " Server error.");
    }
  },

  exportAllTransactions: async (req, res) => {
    try {

      const limit = req.query.limit ? parseInt(req.query.limit) : 999;
      const page = req.query.page ? parseInt(req.query.page) : 1;
      var result = await TransactionModel.find({}, { _id: 0, __v: 0 }).lean()
        .sort({ _id: -1 })
        .lean()


      if (!result) {
        return Helper.response(res, 200, "No Transactions Found");
      } else {
        return Helper.response(res, 200, "All Transactions List", { List: result });
      }

    } catch (err) {
      console.log(err)
      return Helper.response(res, 500, " Server error.");
    }
  },

  createPaymentLink: async (req, res) => {
    try {

      var { customerEmail, customerName, productName, productPrice, productCurrency, paymentMethodType, cardNumber, cardExpMonths, cardExpYear, cardCVC, durationInDays } = req.body

      var findCustomer = await CustomersModel.findOne({ email: customerEmail })
      if (!findCustomer || !findCustomer.customerId) {
        var customerObject = await stripePayment.createCustomr(customerEmail, customerName)
        var findCustomer = await CustomersModel.findOne({ email: customerEmail })
      }

      if (!findCustomer.productsId) {
        const createProducts = await stripePayment.createProduct(productName, customerEmail)
        findCustomer.productsId = createProducts.id
      }

      if (!findCustomer.priceId) {
        const createPrices = await stripePayment.createPrice(findCustomer.productsId, productPrice, productCurrency, customerEmail, durationInDays)
        findCustomer.priceId = createPrices.id
      }

      if (!findCustomer.paymentMethodId) {
        const paymentMethods = await stripePayment.paymentMethod(findCustomer.customerId, paymentMethodType, cardNumber, cardExpMonths, cardExpYear, cardCVC, customerEmail)

        findCustomer.paymentMethodId = paymentMethods.id
      }

      if (!findCustomer.subscriptionsId) {
        const createSubscriptions = await stripePayment.createSubscription(findCustomer.customerId, findCustomer.paymentMethodId, findCustomer.priceId, customerEmail, req.body.metaData)

        findCustomer.subscriptionsId = createSubscriptions.id
      }

      if (!findCustomer.subscriptionItemIds) {
        const subscriptionItemIds = await stripePayment.subscriptionItemId(findCustomer.customerId, findCustomer.subscriptionsId, findCustomer.priceId, customerEmail)
        findCustomer.subscriptionsId = subscriptionItemIds.id
      }
      var a = await stripe.paymentMethods.attach(findCustomer.paymentMethodId, { customer: findCustomer.customerId });

      var deleteDetails = await CustomersModel.remove({ email: customerEmail })

      // const paymentMethod = await stripe.paymentMethods.update( a.id, {
      //   metadata: {
      //     'key1': 'value1',
      //     'key2': 'value2'
      //   }
      // });


      if (!a) {
        return Helper.response(res, 200, "Failed");
      } else {
        return Helper.response(res, 200, "Success", { data: a });
      }

    } catch (err) {
      console.log(err)
      return Helper.response(res, 500, " Server error.");
    }
  },

  cancelSuscription: async (req, res) => {
    try {

      var { suscriptionId, collectionDocId } = req.body
      const updatedSubscription = await stripe.subscriptions.update(suscriptionId, {
        cancel_at_period_end: true
      });


      // if (updatedSubscription) {
      //   var data = {
      //     subscriptionId: updatedSubscription.id,
      //     renewal_date: updatedSubscription.current_period_end,
      //     status: updatedSubscription.status,
      //     autoRenewalStatus: false

      //   }
      // }

      // if (collectionDocId) {
      //   await updateFirebaseCollectionDoc('users', collectionDocId, data)
      // }


      return Helper.response(res, 200, "stop auto-renewal");
    } catch (err) {
      console.log(err)
      return Helper.response(res, 500, " Server error.");
    }
  },

  getSuscription: async (req, res) => {
    try {
      const subscription = await stripe.subscriptions.retrieve(req.query.suscriptionId);
      if (subscription) {
        return Helper.response(res, 200, "Subscription Detilas", { detials: subscription });
      } else {
        return Helper.response(res, 422, "something went wrong");
      }

    } catch (err) {
      console.log(err)
      return Helper.response(res, 500, " Server error.");
    }
  },

  renewSuscription: async (req, res) => {
    try {
      const subscription = await stripe.subscriptions.retrieve(req.query.suscriptionId);
      if (subscription) {
        return Helper.response(res, 200, "Subscription Detilas", { detials: subscription });
      } else {
        return Helper.response(res, 422, "something went wron");
      }


    } catch (err) {
      console.log(err)
      return Helper.response(res, 500, " Server error.");
    }
  },

  //http://54.64.43.5/api/v1/payment-failed

  // subscriptionUpdate: async (req, res) => {
  //   try {


  //     const subscriptionId = req.body.data.object.id;
  //     if (!subscriptionId) {
  //       return Helper.response(res, 422, "subscriptionId wrong");
  //     }

  //     const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  //     if (!subscription) {
  //       return Helper.response(res, 422, "data not found");
  //     }

  //     var data = {
  //       subscriptionId: subscription.id,
  //       startDate: subscription.start_date,
  //       renewal_date: subscription.current_period_end,
  //       status: subscription.status,
  //       autoRenewalStatus: false

  //     }
  //     var collectionDocId = req.body.data.object.metadata.collectionDocId
  //     if (collectionDocId) {
  //       await updateFirebaseCollectionDoc('users', collectionDocId, data)
  //     }

  //     return Helper.response(res, 200, "Subscription Details Update");




  //     // var event = req.body;
  //     // if (event.type === 'customer.subscription.paused') {

  //     //   var data = {
  //     //     subscriptionId: req.body.data.object.id,
  //     //     renewal_date: req.body.data.object.current_period_end,
  //     //     status: 'paused'
  //     //   }

  //     // } else {
  //     //   var data = {
  //     //     subscriptionId: req.body.data.object.id,
  //     //     renewal_date: req.body.data.object.current_period_end,
  //     //     status: req.body.data.object.status
  //     //   }
  //     // }

  //     // var collectionDocId = req.body.data.object.metadata.collectionDocId

  //     // if (collectionDocId) {
  //     //   await updateFirebaseCollectionDoc('users', collectionDocId, data)
  //     // }

  //     // return Helper.response(res, 200, "Subscription Details Update");

  //   } catch (err) {
  //     console.log(err)
  //     return Helper.response(res, 500, " Server error.", { err });
  //   }
  // },


  subscriptionUpdate: async (req, res) => {
    try {
      const subscriptionId =req.body.data.object.id;
      if (!subscriptionId) {
        return Helper.response(res, 422, "subscriptionId wrong");
      }
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      if (!subscription) {
        return Helper.response(res, 422, "data not found");
      }
      const data = {
        subscriptionId: subscription.id,
        startDate: subscription.start_date,
        renewal_date: subscription.current_period_end,
        status: subscription.status,
        autoRenewalStatus: false
      };
      const collectionDocId = req.body.data.object.metadata.collectionDocId;
      if (collectionDocId) {
        await updateFirebaseCollectionDoc('users', collectionDocId, data);
      }
      return Helper.response(res, 200, "Subscription Details Update");
    } catch (err) {
      console.log(err);
      return Helper.response(res, 500, "Server error.", { err });
    }
  },
  

  invoice_payment_failed: async (req, res) => {
    try {

      var event = req.body;

      console.log("2")

      //  var event = {
      //   "id": "evt_1ABCDEFGHIJKLMN",
      //   "object": "event",
      //   "api_version": "2020-08-27",
      //   "created": 1625345032,
      //   "data": {
      //     "object": {
      //       "id": "in_1PQRSTUVWXYZ",
      //       "object": "invoice",
      //       "amount_due": 1000,
      //       "customer": "cus_1234567890",
      //       "subscription": "sub_1NPUDQHELCnzH5PnJD7B2oNC",
      //       "status": "failed",
      //       // अन्य इनवॉइस डेटा फ़ील्ड्स
      //     }
      //   },
      //   // अन्य इवेंट डेटा फ़ील्ड्स
      // }


      if (event) {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        var subscriptionData = await stripe.subscriptions.retrieve(subscriptionId)
        if (subscriptionData) {
          var data = {
            subscriptionId: subscriptionData.id,
            renewal_date: subscriptionData.current_period_end,
            status: subscriptionData.status
          }
          var collectionDocId = subscriptionData.metadata.collectionDocId
          if (collectionDocId) {
            await updateFirebaseCollectionDoc('users', collectionDocId, data)
          }
        }
      }


      return Helper.response(res, 200, "Subscription Details Update");

    } catch (err) {
      console.log(err)
      return Helper.response(res, 500, " Server error.", { err });
    }
  },

  getSubAutoRenewalDetails: async (req, res) => {
    try {
      const subscriptionId = req.query.subscriptionId;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const startDate = new Date(subscription.start_date * 1000);
      const endDate = new Date(subscription.current_period_end * 1000);
      const autoRenewalStatus = !subscription.cancel_at_period_end;

      let status;
      if (subscription.status === "active") {
        status = "Active";
      } else if (subscription.status === "trialing") {
        status = "Trial";
      } else if (subscription.status === "canceled") {
        status = "Canceled";
      } else if (subscription.status === "incomplete") {
        status = "Incomplete";
      } else if (subscription.status === "incomplete_expired") {
        status = "Incomplete (Expired)";
      } else if (subscription.status === "past_due") {
        status = "Past Due";
      } else if (subscription.status === "unpaid") {
        status = "Unpaid";
      } else if (subscription.status === "active") {
        status = "Active";
      } else {
        status = "Unknown";
      }

      return Helper.response(res, 200, "Subscription details", {
        status,
        startDate,
        endDate,
        autoRenewalStatus,
      });
    } catch (err) {
      console.log(err);
      return Helper.response(res, 500, "Server error.", { err });
    }
  },





}


async function createSerachObj(req) {
  try {
    var searchObj = {}
    var search = req.query.search
    var filterDate = req.query.filterDate
    var filter = req.query.filter
    if (search) {
      search = search.replace(/\s/g, "")
    }

    if (search) {
      searchObj = {
        $or: [
          { mobileNumber: { $regex: search, $options: 'i' } },
          { firstName: { $regex: '^' + search + '$', $options: 'i' } },
          { lastName: { $regex: '^' + search + '$', $options: 'i' } },
          { fullname: { $regex: '^' + search + '$', $options: 'i' } },
          { fullname: { $regex: '^' + search, $options: 'i' } }
        ]
      }
    }

    if (!search && filterDate || filter) {
      search = ''
    }

    if (filterDate) {
      var endDate = new Date();
      if (filterDate == 7) {
        var startDate = new Date();
        startDate.setDate(startDate.getDate() - filterDate);
      }
      if (filterDate == 12 || filterDate == 6) {
        var startDate = new Date();
        startDate.setMonth(startDate.getMonth() - filterDate);
      }
      searchObj = {
        $and: [{ date: { '$gte': startDate, '$lte': endDate } },
        {
          $or: [
            { mobileNumber: { $regex: search, $options: 'i' } },
            { firstName: { $regex: '^' + search + '$', $options: 'i' } },
            { lastName: { $regex: '^' + search + '$', $options: 'i' } },
            { fullname: { $regex: '^' + search + '$', $options: 'i' } },
            { fullname: { $regex: '^' + search, $options: 'i' } }
          ]
        }]
      }

      if (filter) {

        searchObj = {
          $and: [
            { status: filter },
            { date: { '$gte': startDate, '$lte': endDate } },
            {
              $or: [
                { mobileNumber: { $regex: search, $options: 'i' } },
                { firstName: { $regex: '^' + search + '$', $options: 'i' } },
                { lastName: { $regex: '^' + search + '$', $options: 'i' } },
                { fullname: { $regex: '^' + search + '$', $options: 'i' } },
                { fullname: { $regex: '^' + search, $options: 'i' } }
              ]
            }]
        }

      }
    }

    if (filter) {
      search = req.query.search
      if (search) {
        search = search.replace(/\s/g, "")
      } else {
        search = ''
      }

      searchObj = {
        $and: [
          { status: filter },

          {
            $or: [
              { mobileNumber: { $regex: search, $options: 'i' } },
              { firstName: { $regex: '^' + search + '$', $options: 'i' } },
              { lastName: { $regex: '^' + search + '$', $options: 'i' } },
              { fullname: { $regex: '^' + search + '$', $options: 'i' } },
              { fullname: { $regex: '^' + search, $options: 'i' } }
            ]
          }]
      }

      if (filterDate) {
        var endDate = new Date();
        if (filterDate == 7) {
          var startDate = new Date();
          startDate.setDate(startDate.getDate() - filterDate);
        }
        if (filterDate == 12 || filterDate == 6) {
          var startDate = new Date();
          startDate.setMonth(startDate.getMonth() - filterDate);
        }

        searchObj = {
          $and: [
            { status: filter },
            { date: { '$gte': startDate, '$lte': endDate } },
            {
              $or: [
                { mobileNumber: { $regex: search, $options: 'i' } },
                { firstName: { $regex: '^' + search + '$', $options: 'i' } },
                { lastName: { $regex: '^' + search + '$', $options: 'i' } },
                { fullname: { $regex: '^' + search + '$', $options: 'i' } },
                { fullname: { $regex: '^' + search, $options: 'i' } }
              ]
            }]
        }

      }

    }

    return searchObj

  } catch (err) {
    console.log("in catch block", err);
  };
}
async function createPaymentLinks(PRICE_ID) {

  const paymentLink = await stripe.paymentLinks.create({
    line_items: [{ price: PRICE_ID, quantity: 1 }],
  });
  console.log(paymentLink, "link")
  return paymentLink
}
async function createPaymentIntent() {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: 1099,
    currency: 'usd',
    payment_method_types: ['card'],
    metadata: {
      order_id: '6735',
      name: '6735',
      mob: '6735'

    },
    customer: 'cus_NImKaZkAWOKHEx'
  });
  return paymentIntent
}
async function paymentIntentConfirm() {
  const paymentIntentConfirm = await stripe.paymentIntents.confirm(
    paymentIntent.id,
    { payment_method: 'pm_card_visa' }
  );
  return paymentIntentConfirm
}
async function createSubscription(customerId, paymentMethodId, priceId) {



  // Attach payment method to customer
  await stripe.paymentMethods.attach(paymentMethodId.id, { customer: customerId.id });

  // Set payment method as default
  await stripe.customers.update(customerId.id, { invoice_settings: { default_payment_method: paymentMethodId.id } });

  // Create subscription
  const subscription = await stripe.subscriptions.create({
    customer: customerId.id,
    items: [{ price: priceId.id }],
    expand: ['latest_invoice.payment_intent'],
    trial_period_days: 7, // optional trial period
    collection_method: 'charge_automatically', // automatic payments
  });

  return subscription

}
async function updateFirebaseCollectionDoc(collection, collectionDocId, data) {

  // var stripeData = {
  //   "trasactionId": data.object.id,
  //   "startDate": data.object.current_period_start,
  //   "endDate": data.object.current_period_end,
  //   "paymentDate": data.object.created,
  //   "plan": data.object.plan.interval_count + " " + data.object.plan.interval,
  //   "renewDate": data.object.current_period_end,
  //   "amount": data.object.plan.amount,
  //   "currency": data.object.currency,
  //   "card": {
  //     "cardNumber": data.object.metadata.cardNumber,
  //     "cardExpMonths": data.object.metadata.cardExpMonths,
  //     "cardExpYear": data.object.metadata.cardExpYear,
  //     "cardCVC": data.object.metadata.cardCVC,
  //   }
  // }
  const updateCollectionDocById = doc(db, collection, collectionDocId);
  await updateDoc(updateCollectionDocById, { stripeData: data });
  return
}








