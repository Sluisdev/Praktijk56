const mongoose  = require('mongoose')

const productSchema = new mongoose.Schema({
    productId: {
        type: Number,
        required: true
    },
    name: {
        type: String, 
        required: true
    },
    duration: {
        type: Number,
        required: true
    }, 
    description: {
        type: String,
        required: true
    }
});

const Product = mongoose.model('Product', productSchema)

module.exports = Product
