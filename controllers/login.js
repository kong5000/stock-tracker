const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const loginRouter = require('express').Router()
const User = require('../models/user')

const generateTokenForUser = (user) => {
    const userInfo = {
        username: user.username,
        id: user._id
    }

    const token = jwt.sign(userInfo, process.env.SECRET)
    return token
}

loginRouter.post('/', async (req, res) => {
    const body = req.body

    const user = await User.findOne({ username: body.username })
    if (user) {
        const passwordValid = await bcrypt.compare(body.password, user.passwordHash)
        if (passwordValid) {
            const token = generateTokenForUser(user)
            res.status(200).send({ token, username: user.username, settings: user.settings })
        } else {
            return res.status(401).json({
                error: 'wrong password'
            })
        }
    } else {
        return res.status(401).json({
            error: 'username not found'
        })
    }

})

module.exports = loginRouter