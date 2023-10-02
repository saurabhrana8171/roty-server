const TransactionModel = require('../../models/TransactionModel');
const CustomersModel = require('../../models/CustomersModel');
const metaDataModel = require('../../models/metaDataModel');
const Helper = require('../../config/helper');
const stripePayment = require('../../config/stripe');
const stripkey = process.env.stripe
const stripe = require('stripe')(stripkey);
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc, updateDoc } = require('firebase/firestore');
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
const ejs = require('ejs');







module.exports = {

  createPaymentLink: async (req, res) => {
    try {
      const {
        customerEmail,
        customerName,
        productName,
        productPrice,
        productCurrency,
        paymentMethodType,
        cardNumber,
        cardExpMonths,
        cardExpYear,
        cardCVC,
        durationInDays,
        metaData
      } = req.body;

      const subscription = await stripePayment.createSubscriptionAndReturnLink(req);

      if (!subscription) {
        return Helper.response(res, 422, "Payment Link Creation Failed",);
      }

      return Helper.response(res, 200, "Payment Link Created Successfully", { link: subscription });

    } catch (err) {
      console.error(err);
      return Helper.response(res, 500, "Server error.", err);
    }
  },

  createSubscriptionWebhook: async (req, res) => {
    try {
      const subscriptionData = req.body.data.object;
      const priceId = subscriptionData.items.data[0].price.id;
      const subscriptionId = subscriptionData.id;

      const getPriceIdMetadata = await metaDataModel.findOne({ priceId: priceId }, { metaData: 1 });
      var metaData = getPriceIdMetadata.metaData[0];

      const updatedSubscription = await stripe.subscriptions.update(subscriptionId, { metadata: metaData });

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      if (!subscription) {
        return Helper.response(res, 422, "Data not found");
      }

      const autoRenewalStatusCurrentStatus = !subscription.cancel_at_period_end;

      const data = {
        subscriptionId: subscription.id,
        startDate: subscription.start_date,
        renewal_date: subscription.current_period_end,
        status: subscription.status,
        autoRenewalStatus: autoRenewalStatusCurrentStatus,
        durationInDays: subscription.plan.interval_count
      };
      var collectionDocId = metaData.fireBaseCollectionDocId
      if (collectionDocId) {
        await updateFirebaseCollectionDoc('users', collectionDocId, data);
      }

      return Helper.response(res, 200, "Save transactions");
    } catch (err) {
      console.error(err);
      return Helper.response(res, 500, "Server error.", { err });
    }
  },

  cancelSuscription: async (req, res) => {
    try {

      var { suscriptionId, collectionDocId } = req.body
      const updatedSubscription = await stripe.subscriptions.update(suscriptionId, {
        cancel_at_period_end: true
      });

      return Helper.response(res, 200, "stop auto-renewal");
    } catch (err) {
      console.log(err)
      return Helper.response(res, 500, " Server error.");
    }
  },

  subscriptionUpdate: async (req, res) => {
    try {

      let collectionid = req.body.data.object.metadata.fireBaseCollectionDocId || null;
      if (!collectionid || collectionid == null) {
        return Helper.response(res, 200, "Subscrption update First TIme");
      }

      const subscriptionId = req.body.data.object.id;
      if (!subscriptionId) return Helper.response(res, 422, "subscriptionId missing");
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      if (!subscription) return Helper.response(res, 422, "subscription not retrive");

      var userData = await getDocumentById('users', req.body.data.object.metadata.fireBaseCollectionDocId);
      if (!userData || userData.stripeData.subscriptionId != subscription.id) {
        return Helper.response(res, 200, "Wevhook call for old subscriptions");
      }

      if (subscription.cancel_at_period_end == false) {
        var autoRenewalStatusCurrentstatus = true
      } else {
        var autoRenewalStatusCurrentstatus = false
      }
      const data = {
        subscriptionId: subscription.id,
        startDate: subscription.start_date,
        renewal_date: subscription.current_period_end,
        status: subscription.status,
        autoRenewalStatus: autoRenewalStatusCurrentstatus,
        durationInDays: subscription.plan.interval_count
      };

      const collectionDocId = req.body.data.object.metadata.fireBaseCollectionDocId;
      if (collectionDocId) {
        await updateFirebaseCollectionDoc('users', collectionDocId, data);
      }
      return Helper.response(res, 200, "Subscription Details Update");
    } catch (err) {
      console.log(err);
      return Helper.response(res, 500, "Server error.", { err });
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

  paymentSuccessPage: async (req, res) => {
    try {
      res.render('success');
    } catch (err) {
      console.error('Error rendering template:', err);
      return Helper.response(res, 500, "Server error.", err);
    }
  },

  paymentFaildPage: async (req, res) => {
    try {
      res.render('failed');
    } catch (err) {
      console.error('Error rendering template:', err);
      return Helper.response(res, 500, "Server error.", err);
    }
  },






  stripeWebHook: async (req, res) => {
    try {


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
          // var data = {
          //   subscriptionId: req.body.data.object.id,
          //   renewal_date: req.body.data.object.current_period_end,
          //   status: "active"

          // }

          const subscription = await stripe.subscriptions.retrieve(req.body.data.object.id);
          if (!subscription) {
            return Helper.response(res, 422, "data not found");
          }


          if (subscription.cancel_at_period_end == false) {
            var autoRenewalStatusCurrentstatus = true
          } else {
            var autoRenewalStatusCurrentstatus = false
          }


          var data = {
            subscriptionId: subscription.id,
            startDate: subscription.start_date,
            renewal_date: subscription.current_period_end,
            status: subscription.status,
            autoRenewalStatus: autoRenewalStatusCurrentstatus,
            durationInDays: subscription.plan.interval_count
          };

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

async function updateFirebaseCollectionDoc(collection, collectionDocId, data) {
  const updateCollectionDocById = doc(db, collection, collectionDocId);
  await updateDoc(updateCollectionDocById, { stripeData: data });
  return
}

async function getDocumentById(collectionName, documentId) {
  try {
    const docRef = doc(db, collectionName, documentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      // console.log('Document data:', docSnap.data());
      return docSnap.data()
    } else {
      console.log('Document not found!');
    }
  } catch (error) {
    console.error('Error fetching document:', error);
  }
}





