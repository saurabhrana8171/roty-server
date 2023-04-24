
const mongoose = require('mongoose')
const Schema = mongoose.Schema;
const mongoosePaginate = require('mongoose-paginate');




const customerSchema = new Schema({




    email: { type: String, default: "" },
    customerId: { type: String, default: "" },
    productsId:{ type: String, default: "" },
     priceId:{ type: String, default: "" },
     paymentMethodId:{ type: String, default: "" },
    subscriptionsId:{ type: String, default: "" },
    subscriptionItemId:{ type: String, default: "" },
    createdDate: { type: Date, default: Date.now },

})




customerSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("customer", customerSchema);




