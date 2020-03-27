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
    for (i = 0; i < initialStocks.length; i++) {
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
    const tickers = response.body.map(stock => stock.ticker)
    expect(tickers).toContain(
        'AAPL'
    )
})

test('can delete a specific stock', async () => {
    const stocks = await api.get('/api/stocks')
    console.log(stocks.body)
    const stockIDs = stocks.body.map(stock => stock.id)

    await api.delete(`/api/stocks/${stockIDs[0]}`)

    const remainingStocks = await api.get('/api/stocks')
    console.log(remainingStocks.body.length)

    expect(remainingStocks.body.length).toBe(initialStocks.length - 1)
})

test('can modify a stock', async () => {
    const stocks = await api.get('/api/stocks')
    const stockIDs = stocks.body.map(stock => stock.id)
    const updateStock = {
        "ticker": "AAPL",
        "name": "Apple Inc.",
        "shares": 1,
        "price": 252.76
    }
    const response = api
        .put(`/api/stocks/${stockIDs[0]}`)
        .send(updateStock)
        .end((err, res) => {
            done()
        })

    const updatedStocks = await api.get('/api/stocks')
    expect(updatedStocks.body[0].shares).toBe(updateStock.shares)
    //Other stocks are unmodified
    expect(updatedStocks.body[1].shares).toBe(initialStocks[1].shares)
})

afterAll(() => {
    mongoose.connection.close()
})