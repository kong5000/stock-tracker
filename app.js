const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const morgan = require('morgan')
const config = require('./utils/config')
const mongoose = require('mongoose')
const usersRouter = require('./controllers/users')
const loginRouter = require('./controllers/login')
const portfolioRouter = require('./controllers/portfolio')
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
app.use(cors())
app.use(express.json())
app.use(morgan('tiny'))
app.use('/api/users', usersRouter)
app.use('/api/login', loginRouter)
app.use('/api/portfolio', portfolioRouter)


app.use(middleware.errorHandler)
app.use(middleware.unknownEndpoint)

module.exports = app