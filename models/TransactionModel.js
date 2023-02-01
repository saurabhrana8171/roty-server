
const mongoose = require('mongoose')
const Schema = mongoose.Schema;
const mongoosePaginate = require('mongoose-paginate');




const transactionSchema = new Schema({



    mobileNumber: { type: String, default: "" },
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    fullname: { type: String, default: "" },
    email: { type: String, default: "" },
    txn: { type: String, default: "" },
    amount: { type: Number, default: 0 },
    date: { type: Date, default: Date.now },
    status: { type: String, default: "" },
    createdDate: { type: Date, default: Date.now },

})




transactionSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("transaction", transactionSchema);




