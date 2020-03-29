const usersRouter = require('express').Router()
const User = require('../models/user')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const Stock = require('../models/stock')

const MIN_PASSWORD_LENGTH = 4
const SALT_ROUNDS = 10

const extractToken = (request) => {
    const authorization = request.get('authorization')
    if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
        return authorization.substring(7)
    }
    return null
}

usersRouter.post('/', async (req, res, next) => {
    const body = req.body
    if (body.password.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).send({ error: 'password must be greater than 4 characters' })
    }

    const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS)

    const user = new User({
        username: body.username,
        passwordHash
    })

    try {
        const userSaved = await user.save()
        if (userSaved) {
            res.json(userSaved.toJSON())
        } else {
            res.status(400).end()
        }
    } catch (e) {
        next(e)
    }
})

usersRouter.post('/asset', async (req, res, next) => {
    const body = req.body
    const token = extractToken(req)
    const decodedToken = jwt.verify(token, process.env.SECRET)
    if(!token || !decodedToken){
        return res.status(401).json({error: 'invalid token'})
    }

    const user = await User.findById(decodedToken.id)

    const stock = new Stock({
        ticker: body.ticker,
        name: body.name,
        shares: body.shares,
        price: body.price,
        costBasis: body.price * body.shares,
        date: body.date || new Date(),
    })
    user.stocks = user.stocks.concat(stock)
    const updatedUser = await user.save()
    res.json(updatedUser)
})

module.exports = usersRouter