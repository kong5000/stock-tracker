const usersRouter = require('express').Router()
const User = require('../models/user')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const Stock = require('../models/stock')
const axios = require('axios')

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


usersRouter.delete('/', async (req, res, next) => {
    const token = extractToken(req)
    const decodedToken = jwt.verify(token, process.env.SECRET)
    if(!token || !decodedToken){
        return res.status(401).json({error: 'invalid token'})
    }

    try{
        await User.findByIdAndRemove(decodedToken.id)
        res.status(204).end()
    }catch(exception){
        next(exception)
    }
})
module.exports = usersRouter