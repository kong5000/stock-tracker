const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const loginRouter =  require('express').Router()
const User = require('../models/user')

const verifyPassword = async ( password, user ) => {
    return bcrypt.compare(password, user.passwordHash)
}

loginRouter.post('/', async (req, res) => {
    const body = req.body

    const validUsername = await User.findOne({ username: body.username})
    if(validUsername){
       const passwordValid = await bcrypt.compare(body.password, validUsername.passwordHash)
        if(passwordValid){
            res.status(200).end()
        }
    }
    res.status(400).end()
})

module.exports = loginRouter