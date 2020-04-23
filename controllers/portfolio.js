const portfolioRouter = require('express').Router()
const User = require('../models/user')
const jwt = require('jsonwebtoken')
const axios = require('axios')
const HALF_HOUR = 1800

const extractToken = (request) => {
    const authorization = request.get('authorization')
    if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
        return authorization.substring(7)
    }
    return null
}

const getPortfolioValue = (stocks) => {
    const getTotal = (total, stock) => {
        return total + stock.price * stock.shares
    }
    return (stocks.reduce(getTotal, 0))
}

const makeStockUpdateApiUrl = (stocks) => {
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
    return base + symbols + types + key
}

const makeChartApiUrl = (symbol) => {
    const base = `https://cloud.iexapis.com/stable/stock/${symbol}/batch?`
    const parameters = '&types=chart&range=6m&chartCloseOnly=true'
    const filter = '&filter=date,close'
    const key = `&token=${process.env.IEX_API_KEY}`
    return base + parameters + filter + key
}

portfolioRouter.post('/chart', async (req, res, next) => {
    const body = req.body
    const token = extractToken(req)
    const decodedToken = jwt.verify(token, process.env.SECRET)
    if (!token || !decodedToken) {
        return res.status(401).json({ error: 'invalid token' })
    }

    const user = await User.findById(decodedToken.id)
    const stocks = user.assets.stocks
    const stockToChartIndex = stocks.findIndex(stock => stock.ticker == body.ticker)
    const stockToChart = stocks[stockToChartIndex]

    const currentDate = new Date()

    //If the stock has a chart
    if (stockToChart.lastChartUpdate) {
        console.log('USING FROM MEMORY')
        //If that chart has been updated recently
        console.log(stockToChart.lastChartUpdate)
        console.log('Last update was',stockToChart.lastChartUpdate.getTime())
        console.log('Time now is',currentDate.getTime())
        console.log('Seconds since last update', (currentDate.getTime() - stockToChart.lastChartUpdate.getTime()  ) / 1000 )
        if ((currentDate.getTime() - stockToChart.lastChartUpdate.getTime()) / 1000 < HALF_HOUR) {
            //Dont make an API request to IEX and just return the existing chart
            return res.status(200).json(stockToChart.chart)
        }
    }

    const url = makeChartApiUrl(body.ticker)
    try {
        console.log('API REQUEST MADE')
        const response = await axios.get(url)
        const chart = response.data
        //Update the user's stored chart of the stock
        user.assets.stocks[stockToChartIndex].chart = chart
        user.assets.stocks[stockToChartIndex].lastChartUpdate = new Date()
        await user.save()

        // console.log(response.data)
        // res.status(200).json(response.data)

        res.status(200).json( user.assets.stocks[stockToChartIndex].chart )
    } catch (error) {
        console.log(error.response.statusText)
        // Payment Required
        // Not Found
        return res.status(401).json({ error: error.response.statusText })
    }
})

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
    if (body.useCash) {
        user.assets.cash += body.shares * body.price
    }

    await user.save()
    res.status(200).json(user.assets)
})

portfolioRouter.post('/allocation', async (req, res, next) => {
    const token = extractToken(req)
    const decodedToken = jwt.verify(token, process.env.SECRET)
    if (!token || !decodedToken) {
        return res.status(401).json({ error: 'invalid token' })
    }
    if (req.body.stocks) {
        const updatedStocks = req.body.stocks

        const user = await User.findById(decodedToken.id)
        user.assets.stocks = updatedStocks

        const updatedUser = await user.save()
        return res.status(200).send(updatedUser.assets)
    }
    return res.status(400).end()
})

portfolioRouter.post('/update', async (req, res, next) => {
    const token = extractToken(req)
    const decodedToken = jwt.verify(token, process.env.SECRET)
    if (!token || !decodedToken) {
        return res.status(401).json({ error: 'invalid token' })
    }


    const user = await User.findById(decodedToken.id)
    if (user.assets.stocks.length === 0) {
        return res.status(200).end()
    }

    const stocks = user.assets.stocks
    const url = makeStockUpdateApiUrl(stocks)

    try {
        const response = await axios.get(url)
        const updatedStocks = Object.values(response.data)
        stocks.forEach(stock => {
            for (i = 0; i < updatedStocks.length; i++) {
                if (updatedStocks[i].quote.symbol === stock.ticker) {
                    const latestPrice = updatedStocks[i].quote.latestPrice
                    stock.price = latestPrice
                    stock.date = updatedStocks[i].quote.latestUpdate
                    stock.currentWeight = (latestPrice * stock.shares) / getPortfolioValue(stocks)
                }
            }
        })
        const updatedUser = await user.save()
        res.status(200).send(updatedUser.assets)
    } catch (error) {
        console.log(error)
        return res.status(401).json({ error: 'user not found' })
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

    if (body.useCash) {
        if (user.assets.cash < body.shares * body.price) {
            return res.status(400).json({ error: 'insufficient cash in portfolio' })
        } else {
            user.assets.cash -= body.shares * body.price
        }
    }
    const totalPortfolioValue = getPortfolioValue(user.assets.stocks)

    const stock = {
        ticker: body.ticker,
        name: body.name ? body.name : '',
        shares: body.shares,
        price: body.price,
        costBasis: body.price,
        date: body.date || new Date(),
        targetWeight: body.targetWeight,
        currentWeight: body.price * body.shares / (totalPortfolioValue + body.price * body.shares),
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

portfolioRouter.post('/cash', async (req, res, next) => {
    const token = extractToken(req)
    const decodedToken = jwt.verify(token, process.env.SECRET)
    if (!token || !decodedToken) {
        return res.status(401).json({ error: 'invalid token' })
    }
    const newCash = Number(req.body.cash)
    const user = await User.findById(decodedToken.id)
    user.assets.cash += newCash
    if (user.assets.cash < 0) {
        return res.status(400).json({ error: 'negative balance' })
    }
    await user.save()
    res.status(200).json(user.assets)
})

module.exports = portfolioRouter