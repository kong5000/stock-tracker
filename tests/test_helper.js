const User = require('../models/user')
const initialUser = {
    username: 'testuser',
    password: 'testpassword'
}

const testStocks = [
    {
        "ticker": "IBM",
        "name": "International Business Machines",
        "shares": 5,
        "price": 10
    }
]

const getTestUser = async () => {
    const user = await User.findOne({username: initialUser.username})
    return user
}

module.exports = {
    initialUser, testStocks, getTestUser
}