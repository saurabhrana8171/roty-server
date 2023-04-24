
const mongoose = require('mongoose')
const Schema = mongoose.Schema;
const mongoosePaginate = require('mongoose-paginate');




const productIdSchema = new Schema({





    productsId: { type: String, default: "" },
    price: { type: String, default: "" },
    createdDate: { type: Date, default: Date.now },

})




productIdSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("productId", productIdSchema);




