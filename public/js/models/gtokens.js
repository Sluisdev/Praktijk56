const mongoose = require('mongoose')

const tokenSchema = mongoose.Schema({
    refreshToken: {
        type: String, 
        required: true
    }, 
    accessToken: {
        type: String, 
        required: true
    }, 
    updated: {
        type: Date, default: Date.now()
    }
})

const GoogleTokens = mongoose.model('googleTokens', tokenSchema)

module.exports = GoogleTokens