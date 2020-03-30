const mongoose = require('mongoose')
const uniqueValidator = require('mongoose-unique-validator')

const userSchema = new mongoose.Schema(
    {
        username: {type: String, required: true, minlength: 4, unique: true},
        passwordHash: {type: String, required: true, minlength: 4},
        cash: {type: Number, default: 0},
        stocks: [{
            ticker: {type: String, required: true},
            name: {type: String, required: true},
            shares: {type: Number, required: true},
            price: {type: String, required: true},
            costBasis: Number,
            date: Number,
        }]
    }
)

userSchema.plugin(uniqueValidator)

userSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString()
        delete returnedObject._id
        delete returnedObject.__v
        delete returnedObject.passwordHash
    }
})

const User = mongoose.model('User', userSchema)

module.exports = User