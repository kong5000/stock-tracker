const mongoose = require('mongoose')
const User = require('../models/user')
const supertest = require('supertest')
const app = require('../app')
const api = supertest(app)
const helper = require('./test_helper')

let authorizationToken = null
const getToken = async () => {
    if (authorizationToken) {
        return authorizationToken
    } else {
        return await logUserIn()
    }
}

const logUserIn = async () => {
    const user = await api
        .post('/api/login')
        .send(helper.testUser)
        .expect(200)
    authorizationToken = user.body.token
    return authorizationToken
}

const createUser = async (user) => {
    await api
        .post('/api/users')
        .send(helper.testUser)
        .expect(200)
        .expect('Content-Type', /application\/json/)
}

const deleteAllUsers = async () => {
    await User.deleteMany({})
}

const addStock = async (stock) => {
    const token = await getToken()

    await api
        .post('/api/portfolio/asset')
        .set('Authorization', 'Bearer ' + token)
        .send(stock)
        .expect(200)
        .expect('Content-Type', /application\/json/)
}

const getTestUserStocks = async () => {
    const user = await helper.getTestUser()
    return user.assets.stocks
}

const getTestUserCash = async () => {
    const user = await helper.getTestUser()
    return user.assets.cash
}

const sellStock = async (order) => {
    const token = await getToken()

    await api
        .post('/api/portfolio/sell')
        .set('Authorization', 'Bearer ' + token)
        .send(order)
        .expect(200)
        .expect('Content-Type', /application\/json/)
}

beforeEach(async () => {
    await deleteAllUsers()
    await createUser(helper.testUser)
    await logUserIn()
})

describe('Adding stocks to portfolio', () => {
    test('Can add a new stock to the portfolio', async () => {
        await addStock(helper.testStocks[0])

        const userStocks = await getTestUserStocks()
        const stockTickers = userStocks.map(stock => stock.ticker)
        expect(stockTickers).toContain(helper.testStocks[0].ticker)
    })

    test('Adding a stock that already exist increases share count of existing entry', async () => {
        await addStock(helper.testStocks[0])
        await addStock(helper.testStocks[0])

        const stocks = await getTestUserStocks()
        const updatedStock = stocks.find(stock => stock.ticker === helper.testStocks[0].ticker)
        expect(updatedStock.shares).toEqual(2 * helper.testStocks[0].shares)
    })
})

describe('Selling stocks from portfolio', () => {
    test('Error on selling a stock user does not own', async () => {
        const token = await getToken()
        await api
            .post('/api/portfolio/sell')
            .set('Authorization', 'Bearer ' + token)
            .send(helper.testStocks[0])
            .expect(401)
    })

    test('Error on selling more shares than a user owns', async () => {
        const stock = helper.testStocks[0]
        await addStock(stock)

        const sharesToSell = 2 * stock.shares
        const price = 10
        const sellOrder = {
            ticker: stock.ticker,
            shares: sharesToSell,
            price
        }

        const token = await getToken()
        await api
            .post('/api/portfolio/sell')
            .set('Authorization', 'Bearer ' + token)
            .send(sellOrder)
            .expect(401)
    })

    test('Selling a stock reduces share count and adds sold value to user cash', async () => {
        const stock = helper.testStocks[0]
        await addStock(stock)

        const sharesToSell = 1
        const price = 10
        const sellOrder = {
            ticker: stock.ticker,
            shares: sharesToSell,
            price
        }
        await sellStock(sellOrder)

        const userStocks = await getTestUserStocks()
        const updatedStock = userStocks.find(stock => stock.ticker === stock.ticker)
        expect(updatedStock.shares).toEqual(stock.shares - sharesToSell)

        const cash = await getTestUserCash()
        expect(cash).toEqual(sharesToSell * price)
    })

    test('Selling all shares of a stock removes it from the user\'s account', async () => {
        const stock = helper.testStocks[0]
        await addStock(stock)
        const sharesToSell = stock.shares
        const price = stock.price
        const sellOrder = {
            ticker: stock.ticker,
            shares: sharesToSell,
            price
        }
        await sellStock(sellOrder)
        const user = await helper.getTestUser()
        const stocks = user.assets.stocks
        expect(stocks.length).toBe(0)
    })
})

describe('Access external stock api', () => {
    test('Can update prices from IEX api', async () => {
        const stock = { ...helper.testStocks[0] }
        stock.price = 0;
        await addStock(stock)

        const token = await getToken()
        await api
            .post('/api/portfolio/update')
            .set('Authorization', 'Bearer ' + token)
            .expect(200)
        const user = await helper.getTestUser()
        const stocks = user.assets.stocks
        const updatedStock = stocks.filter(asset => asset.ticker === stock.ticker)
        expect(updatedStock.price).not.toBe(stock.price)
    })
})

afterAll(() => {
    mongoose.connection.close()
})