const mongoose = require('mongoose')

const syncTokenSchema = mongoose.Schema({
    token: {
        type: String, 
        required: true
    }, 
    updated: {
        type: Date, default: Date.now()
    }
})

const SyncToken = mongoose.model('synctoken', syncTokenSchema)

module.exports = SyncToken