
const mongoose = require('mongoose')
const Schema = mongoose.Schema;
const mongoosePaginate = require('mongoose-paginate');




const metaDataSchema = new Schema({





    priceId: { type: String, default: "" },
    metaData: [],
    status: { type: Boolean, default: false},
    createdDate: { type: Date, default: Date.now },

})




metaDataSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("metadata", metaDataSchema);




