const Product = require('./models/products')
const mongoose = require('mongoose')
const dotenv = require('dotenv').config()

mongoose.connect(process.env.DATABASE_URL)
.then(() => {
    console.log("CONNECTED TO LOCAL DATABASE")
})
.catch((e) => {
    console.log("Error occurred:", e)
})

Product.insertMany([
    {
    name: 'Massage', 
    productId: 1,
    duration: 30,
    description: 'massage treatment'
    },
    {
    name: 'Spierherstel', 
    productId: 2,
    duration: 45,
    description: 'behandeling voor spierherstel'
    },
    {
    name: 'Maximale ontspanning', 
    productId: 3,
    duration: 60,
    description: 'Volledige behandeling voor geest & lichaam'
    }]
);

// seed.save().then(() => console.log('seeded')).catch((e) => console.log("Error:", e))