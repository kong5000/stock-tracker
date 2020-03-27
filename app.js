const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const config = require('./utils/config')
const mongoose = require('mongoose')
const stocksRouter = require('./controllers/stocks')
const middleware = require('./utils/middleware')
mongoose.set('useFindAndModify', false)

const url = config.MONGODB_URI

mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(result => {
        console.log('connected to MongoDB')
    })
    .catch((error) => {
        console.log('error connecting to MongoDB', error.message)
    })


const app = express()
app.use(express.json())
app.use(morgan('tiny'))
app.use('/', stocksRouter)


app.use(middleware.errorHandler)
app.use(middleware.unknownEndpoint)

module.exports = app