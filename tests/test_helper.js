const User = require('../models/user')
const testUser = {
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
    const user = await User.findOne({username: testUser.username})
    return user
}

module.exports = {
    testUser: testUser, testStocks, getTestUser
}