const mongoose = require('mongoose')

const updateMessagesSchema = mongoose.Schema({
    status: {
        type: String, 
        required: true
    }, 
    title: {
        type: String,
        required: true
    },
    message: {
        header: {type: String},
        body: {type: String},
        closure:{type: String}
    },
    updated: {
        type: Date, default: Date.now()
    }
})

const updateMessages = mongoose.model('updateMessage', updateMessagesSchema)

module.exports = updateMessages