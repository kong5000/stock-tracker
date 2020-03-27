const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const Stock = require('../models/stock')

const api = supertest(app)

const initialStocks = [
    {
        "ticker": "AAPL",
        "name": "Apple Inc.",
        "shares": 10,
        "price": 252.76
    },
    {
        "ticker": "GOOGL",
        "name": "Alphabet Inc.",
        "shares": 5,
        "price": 1129.11
    },
    {
        "ticker": "IBM",
        "name": "International Business Machines Corporation",
        "shares": 12,
        "price": 109.78
    }
]

beforeEach(async () => {
    await Stock.deleteMany({})
    //Can't use foreach loop with async await
    for(i = 0; i < initialStocks.length; i++){
        let stockObject = new Stock(initialStocks[i])
        await stockObject.save()
    }
})

test('Stocks returned as json', async () => {
    await api
        .get('/api/stocks')
        .expect(200)
        .expect('Content-Type', /application\/json/)
})

test('correct number of stocks returned', async () => {
    const response = await api.get('/api/stocks')

    expect(response.body.length).toBe(initialStocks.length)
})

test('can find a specific stock', async () => {
    const response = await api.get('/api/stocks')
    console.log(response.body)
    const tickers = response.body.map(stock => stock.ticker)
    console.log(tickers)
    expect(tickers).toContain(
        'AAPL'
    )
})

afterAll(() => {
    mongoose.connection.close()
})