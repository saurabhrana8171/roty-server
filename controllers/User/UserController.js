const TransactionModel = require('../../models/TransactionModel');
const Helper = require('../../config/helper');
const stripkey = process.env.stripe
const stripe = require('stripe')(stripkey);




module.exports = {

  stripeWebHook: async (req, res) => {
    try {
      var alreadyExixts = await TransactionModel.exists({ txn: req.body.data.object.id })
      if (alreadyExixts) {
        console.log("This pi alrady exixts in database")
        return Helper.response(res, 422, "This is  pi already exixts in database");
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(req.body.data.object.id);
      if (paymentIntent) {
        var transactionsDetails = {
          mobileNumber: paymentIntent.metadata.mobileNumber ? paymentIntent.metadata.mobileNumber : '',
          firstName: paymentIntent.metadata.firstName ? paymentIntent.metadata.firstName : '',
          lastName: paymentIntent.metadata.lastName ? paymentIntent.metadata.lastName : '',
          email: paymentIntent.metadata.email ? paymentIntent.metadata.email : '',
          txn: paymentIntent.id,
          date: new Date(paymentIntent.created * 1000),
          status: paymentIntent.status,
          amount: paymentIntent.amount / 100
        }

        transactionsDetails.fullname = transactionsDetails.firstName + transactionsDetails.lastName.split(/\s/).join('')
        transactionsDetails.fullname = transactionsDetails.fullname.split(/\s/).join('')
        var savetransaction = await new TransactionModel(transactionsDetails).save()
        return Helper.response(res, 200, " Save transactions");

      } else {
        return Helper.response(res, 422, "wrong Pi");
      }
    } catch (err) {
      console.log(err)
      return Helper.response(res, 500, " Server error.");
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




