const portfolioRouter = require('express').Router()
const User = require('../models/user')
const jwt = require('jsonwebtoken')
const axios = require('axios')
const Stock = require('../models/stock')


const extractToken = (request) => {
    const authorization = request.get('authorization')
    if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
        return authorization.substring(7)
    }
    return null
}

portfolioRouter.get('/', async (req, res, next) => {
    const token = extractToken(req)
    const decodedToken = jwt.verify(token, process.env.SECRET)
    if (!token || !decodedToken) {
        return res.status(401).json({ error: 'invalid token' })
    }

    try {
        const user = await User.findById(decodedToken.id)
        if (user) {
            res.status(200).json(user.assets)
        }
        else {
            res.status(400).send({ error: 'user not found' })
        }
    } catch (error) {
        next(error)
    }
})

portfolioRouter.post('/price', async (req, res, next) => {
    const body = req.body
    const url = `https://cloud.iexapis.com/stable/stock/${body.ticker}/quote/latestPrice?token=${process.env.IEX_API_KEY}`

    try {
        const response = await axios.get(url)
        res.status(200).json({ latestPrice: response.data })
    } catch (error) {
        console.log(error)
        return res.status(401).json({ error: 'stock not found' })
    }
})

portfolioRouter.post('/sell', async (req, res, next) => {
    const body = req.body
    const token = extractToken(req)
    const decodedToken = jwt.verify(token, process.env.SECRET)
    if (!token || !decodedToken) {
        return res.status(401).json({ error: 'invalid token' })
    }

    const user = await User.findById(decodedToken.id)
    const userStocks = user.assets.stocks

    const stock = userStocks.find(stock => stock.ticker === body.ticker)
    if (!stock) {
        return res.status(401).json({ error: 'user does not own any shares of this stock' })
    }
    if (stock.shares < body.shares) {
        return res.status(401).json({ error: 'cannot sell more shares than the user owns' })
    }
    stock.shares -= body.shares
    if (stock.shares === 0) {
        const updatedStockList = user.assets.stocks.filter(stock => stock.shares > 0)
        user.assets.stocks = updatedStockList
    }
    if(body.useCash){
        user.assets.cash += body.shares * body.price
    }

    await user.save()
    res.status(200).json(user.assets)
})

portfolioRouter.post('/update', async (req, res, next) => {
    const body = req.body
    const token = extractToken(req)
    const decodedToken = jwt.verify(token, process.env.SECRET)
    if (!token || !decodedToken) {
        return res.status(401).json({ error: 'invalid token' })
    }

    const user = await User.findById(decodedToken.id)
    const stocks = user.assets.stocks
    const base = 'https://cloud.iexapis.com/stable/stock/market/batch?'
    const types = '&types=quote'
    const key = `&token=${process.env.IEX_API_KEY}`
    let symbols = 'symbols='
    for (i = 0; i < stocks.length; i++) {
        if (i === 0) {
            symbols += stocks[i].ticker
        } else {
            symbols += `,${stocks[i].ticker}`
        }
    }
    const url = base + symbols + types + key

    try {
        const response = await axios.get(url)
        const updatedStocks = Object.values(response.data)
        stocks.forEach(stock => {
            for (i = 0; i < updatedStocks.length; i++) {
                if (updatedStocks[i].quote.symbol === stock.ticker) {
                    stock.price = updatedStocks[i].quote.latestPrice
                    console.log(updatedStocks[i].quote.latestUpdate)
                    stock.date = updatedStocks[i].quote.latestUpdate
                }
            }
        })
        const updatedUser = await user.save()
        res.status(200).send(updatedUser.assets)
    } catch (error) {
        console.log(error)
        return res.status(401).json({ error: 'stock not found' })
    }

})

portfolioRouter.post('/asset', async (req, res, next) => {
    const body = req.body
    
    const token = extractToken(req)
    const decodedToken = jwt.verify(token, process.env.SECRET)
    if (!token || !decodedToken) {
        return res.status(401).json({ error: 'invalid token' })
    }

    const user = await User.findById(decodedToken.id)

    if(body.useCash){
        if(user.assets.cash < body.shares * body.price){
            return res.status(400).json({ error: 'insufficient cash in portfolio' })
        }else{
            user.assets.cash -= body.shares * body.price
        }
    }

    const stock = {
        ticker: body.ticker,
        name: body.name,
        shares: body.shares,
        price: body.price,
        costBasis: body.price,
        date: body.date || new Date(),
    }

    const foundStockIndex = user.assets.stocks.findIndex(asset => asset.ticker === stock.ticker)
    if (foundStockIndex >= 0) {
        const existingStock = user.assets.stocks[foundStockIndex]
        const totalValue = (existingStock.costBasis * existingStock.shares) + (stock.shares * stock.price)
        const totalShares = existingStock.shares + stock.shares
        const newCostBasis = totalValue / totalShares
        existingStock.costBasis = newCostBasis
        existingStock.shares += stock.shares
    } else {
        user.assets.stocks = user.assets.stocks.concat(stock)
    }



    const updatedUser = await user.save()
    res.json(updatedUser.assets)
})

module.exports = portfolioRouter