const mongoose = require('mongoose')


const stockSchema = new mongoose.Schema({
    ticker: {type: String, required: true},
    name: {type: String, required: true},
    shares: {type: Number, required: true},
    price: {type: String, required: true},
    costBasis: Number,
    date: Date,
})

stockSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString()
        delete returnedObject._id
        delete returnedObject.__v
    }
})

const Stock = mongoose.model('Stock', stockSchema)

module.exports = Stock