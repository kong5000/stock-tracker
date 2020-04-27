const usersRouter = require('express').Router()
const User = require('../models/user')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const MIN_PASSWORD_LENGTH = 5
const MIN_USERNAME_LENGTH = 3
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
        return res.status(400).send({ error: 'password must be > 4 characters' })
    }
    if (body.username.length < MIN_USERNAME_LENGTH) {
        return res.status(400).send({ error: 'username must be > 2 characters' })
    }
    const alreadyExists = await User.findOne({username: body.username})

    if(alreadyExists){
        return res.status(400).send({ error: 'username already in use' })
    }

    const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS)

    const user = new User({
        username: body.username,
        passwordHash,
        settings: {
            balanceThreshold: 5
        }
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

usersRouter.post('/alerts', async (req, res, next) => {
    const token = extractToken(req)
    const decodedToken = jwt.verify(token, process.env.SECRET)
    if (!token || !decodedToken) {
        return res.status(401).json({ error: 'invalid token' })
    }
    try{
        const user = await User.findById(decodedToken.id)
        user.settings.email = req.body.email
        user.settings.alertFrequency = req.body.alertFrequency
        const updatedUser = await user.save()
        return res.status(200).json(updatedUser)
    } catch (exception){
        return res.status(400).json({error: 'Could not update settings'})
    }
})

usersRouter.post('/settings', async (req, res, next) => {
    const token = extractToken(req)
    const decodedToken = jwt.verify(token, process.env.SECRET)
    if (!token || !decodedToken) {
        return res.status(401).json({ error: 'invalid token' })
    }
    const newSettings = req.body.settings
    try {
        const user = await User.findById(decodedToken.id)
        user.settings = newSettings
        const updatedUser = user.save()
        res.status(200).json(updatedUser)
    } catch (exception) {
        next(exception)
    }
})


usersRouter.post('/threshold', async (req, res, next) => {
    const token = extractToken(req)
    const decodedToken = jwt.verify(token, process.env.SECRET)
    if (!token || !decodedToken) {
        return res.status(401).json({ error: 'invalid token' })
    }
 
    try {
        const user = await User.findById(decodedToken.id)
        const newThreshold = req.body.balanceThreshold
        console.log(newThreshold, 'NEW THRESH HERE')
        user.settings.balanceThreshold = newThreshold
        const updatedUser = await user.save()
        console.log(updatedUser)
        res.status(200).json(updatedUser.settings)
    } catch (exception) {
        next(exception)
    }
})

usersRouter.get('/settings', async (req, res, next) => {
    const token = extractToken(req)
    const decodedToken = jwt.verify(token, process.env.SECRET)
    if (!token || !decodedToken) {
        return res.status(401).json({ error: 'invalid token' })
    }
    try {
        const user = await User.findById(decodedToken.id)
        res.status(200).json(user.settings)
    } catch (exception) {
        next(exception)
    }
})

usersRouter.delete('/', async (req, res, next) => {
    const token = extractToken(req)
    const decodedToken = jwt.verify(token, process.env.SECRET)
    if (!token || !decodedToken) {
        return res.status(401).json({ error: 'invalid token' })
    }

    try {
        await User.findByIdAndRemove(decodedToken.id)
        res.status(204).end()
    } catch (exception) {
        next(exception)
    }
})
module.exports = usersRouter