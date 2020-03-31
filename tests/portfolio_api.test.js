const User = require('../models/user')
const supertest = require('supertest')
const app = require('../app')
const api = supertest(app)

const initialUser = {
    username: 'testuser',
    password: 'testpassword'
}

const testStock1 = {
    "ticker": "IBM",
    "name": "International Business Machines",
    "shares": 5,
    "price": 10
}

const addStock = async (stock, token) => {
    await api
        .post('/api/portfolio/asset')
        .set('Authorization', 'Bearer ' + token)
        .send(stock)
        .expect(200)
        .expect('Content-Type', /application\/json/)
}

const getTestUserStocks = async (token) => {
    const response = await api
        .get('/api/portfolio')
        .set('Authorization', 'Bearer ' + token)
        .expect(200)
        .expect('Content-Type', /application\/json/)
    console.log(response.body)
    return response.body
}

const sellStock = async (order, token) => {
    const response = await api
        .post('/api/portfolio/sell')
        .set('Authorization', 'Bearer ' + token)
        .send(order)
        .expect(200)
        .expect('Content-Type', /application\/json/)
    console.log(response.body.cash)
    console.log(response.body.stocks)
}

let authorizationToken = null

beforeEach(async () => {
    await User.deleteMany({})

    await api
        .post('/api/users')
        .send(initialUser)
        .expect(200)
        .expect('Content-Type', /application\/json/)

    const user = await api
        .post('/api/login')
        .send(initialUser)
        .expect(200)
    authorizationToken = user.body.token
})

describe('Adding stocks to portfolio', () => {
    test('Can add a new stock to the portfolio', async () => {
        await addStock(testStock1, authorizationToken)

        const userStocks = await getTestUserStocks(authorizationToken)
        const stockTickers = userStocks.map(stock => stock.ticker)
        expect(stockTickers).toContain(testStock1.ticker)
    })

    test('Adding a stock that already exist increases share count of existing entry', async () => {
        await addStock(testStock1, authorizationToken)
        await addStock(testStock1, authorizationToken)

        const stocks = await getTestUserStocks(authorizationToken)
        const updatedStock = stocks.find(stock => stock.ticker === testStock1.ticker)
        expect(updatedStock.shares).toEqual(2 * testStock1.shares)
    })
})

describe('Selling stocks from portfolio', () => {
    test('Error on selling a stock user does not own', async () => {
        await api
            .post('/api/portfolio/sell')
            .set('Authorization', 'Bearer ' + authorizationToken)
            .send(testStock1)
            .expect(401)
    })

    test('Selling a stock reduces share count and adds sold value to user cash', async () => {
        await addStock(testStock1, authorizationToken)

        const sharesToSell = 1
        const price = 10
        const sellOrder = {
            ticker: testStock1.ticker,
            shares: sharesToSell,
            price
        }
        await sellStock(sellOrder, authorizationToken)

        const userStocks = await getTestUserStocks(authorizationToken)
        const testStock = userStocks.find(stock => stock.ticker === testStock1.ticker)
        expect(testStock.shares).toEqual(testStock1.shares - sharesToSell)
    })
})