const mongoose = require('mongoose')

const eventsSchema = mongoose.Schema({
    eventId: {
        type: String, 
        required: true
    },
    etag: {
        type: String,
        required: true
    }, 
    start: {
        type: String,
        required: true
    }, 
    end: {
        type: String,
        required: true
    }, 
    status: {
        type: String,
        required: true
    },
    recurring: {
        type: Boolean, 
        required: true
    },
    productId: {
        type: String
    },
    customerDetails:{
        name: {
            type: String
        }, 
        phoneNumber: {
            type: String
        },
        emailAddress: {
            type: String
        }, 
        toc: {
            type: String
        }
    }, 
    updated: {
        type: Date, default: Date.now(),
        required: true
    }
})

const Events = mongoose.model('event', eventsSchema)

module.exports = Events

