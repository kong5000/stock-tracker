const usersRouter = require('express').Router()
const User = require('../models/user')
const bcrypt = require('bcrypt')

const MIN_PASSWORD_LENGTH = 4
const SALT_ROUNDS = 10

usersRouter.post('/', async (req, res, next) => {
    const body = req.body
    if(body.password.length < MIN_PASSWORD_LENGTH){
        return res.status(400).send({error: 'password must be greater than 4 characters'})
    }

    const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS)

    const user = new User({
        username: body.username,
        passwordHash
    })

    try{
        const userSaved = await user.save()
        if (userSaved) {
            res.json(userSaved.toJSON())
        } else {
            res.status(400).end()
        }
    }catch(e){
        next(e)
    }
})

module.exports = usersRouter