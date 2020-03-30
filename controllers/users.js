const usersRouter = require('express').Router()
const User = require('../models/user')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const Stock = require('../models/stock')
const axios = require('axios')

const MIN_PASSWORD_LENGTH = 4
const SALT_ROUNDS = 10

const extractToken = (request) => {
    const authorization = request.get('authorization')
    if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
        return authorization.substring(7)
    }
    return null
}


usersRouter.post('/', async (req, res, next) => {
    const body = req.body
    if (body.password.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).send({ error: 'password must be greater than 4 characters' })
    }

    const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS)

    const user = new User({
        username: body.username,
        passwordHash
    })

    try {
        const userSaved = await user.save()
        if (userSaved) {
            res.json(userSaved.toJSON())
        } else {
            res.status(400).end()
        }
    } catch (e) {
        next(e)
    }
})

usersRouter.post('/price', async (req, res, next) => {
    const body = req.body
    const url = `https://cloud.iexapis.com/stable/stock/${body.ticker}/quote/latestPrice?token=${process.env.IEX_API_KEY}`    
   
    try{
        const response = await axios.get(url)
        res.status(200).json( {latestPrice: response.data} )
    }catch (error) {
        console.log(error)
        return res.status(401).json({error: 'stock not found'})
    }
})

usersRouter.post('/sell', async (req, res, next) => {
    const body = req.body
    const token = extractToken(req)
    const decodedToken = jwt.verify(token, process.env.SECRET)
    if(!token || !decodedToken){
        return res.status(401).json({error: 'invalid token'})
    }

    const user = await User.findById(decodedToken.id)
    const userStocks = user.stocks

    const stock = userStocks.find(stock => stock.ticker === body.ticker)
    if(!stock){
        return res.status(401).json({error: 'user does not own any shares of this stock'})
    }
    if(stock.shares < body.shares){
        return res.status(401).json({error: 'cannot sell more shares than the user owns'})
    }
    stock.shares -= body.shares
    if(stock.shares === 0){
        const updatedStockList = user.stocks.filter(stock => stock.shares > 0)
        user.stocks = updatedStockList
    }
    user.cash += body.shares * body.price
    user.save()
    res.status(200).json(user)
})

usersRouter.post('/update', async (req, res, next) => {
    const body = req.body
    const token = extractToken(req)
    const decodedToken = jwt.verify(token, process.env.SECRET)
    if(!token || !decodedToken){
        return res.status(401).json({error: 'invalid token'})
    }

    const user = await User.findById(decodedToken.id)
    const stocks = user.stocks
    const base= 'https://cloud.iexapis.com/stable/stock/market/batch?'
    const types = '&types=quote'
    const key = `&token=${process.env.IEX_API_KEY}`
    let symbols = 'symbols=' 
    for(i = 0; i < stocks.length; i++){
        if(i === 0){
            symbols+= stocks[i].ticker
        }else{
            symbols+= `,${stocks[i].ticker}`
        }
    }
    const url = base + symbols + types + key

    try{
        const response = await axios.get(url)
        const updatedStocks = Object.values(response.data)
        stocks.forEach(stock => {
            for(i = 0; i < updatedStocks.length; i++){
                if(updatedStocks[i].quote.symbol === stock.ticker){
                    stock.price = updatedStocks[i].quote.latestPrice
                }
            }
        })
        const updatedUser = await user.save()
        res.status(200).send(updatedUser)
    }catch (error) {
        console.log(error)
        return res.status(401).json({error: 'stock not found'})
    }

})

usersRouter.post('/asset', async (req, res, next) => {
    const body = req.body
    const token = extractToken(req)
    const decodedToken = jwt.verify(token, process.env.SECRET)
    if(!token || !decodedToken){
        return res.status(401).json({error: 'invalid token'})
    }

    const user = await User.findById(decodedToken.id)

    const stock = new Stock({
        ticker: body.ticker,
        name: body.name,
        shares: body.shares,
        price: body.price,
        costBasis: body.price,
        date: body.date || new Date(),
    })

    const foundStockIndex = user.stocks.findIndex(asset => asset.ticker === stock.ticker)
    if(foundStockIndex >= 0){
        const existingStock = user.stocks[foundStockIndex]
        const totalValue = (existingStock.costBasis * existingStock.shares) + (stock.shares * stock.price)
        const totalShares = existingStock.shares + stock.shares
        const newCostBasis = totalValue / totalShares
        existingStock.costBasis = newCostBasis
        existingStock.shares += stock.shares
    }else{
        user.stocks = user.stocks.concat(stock)
    }

    const updatedUser = await user.save()
    res.json(updatedUser)
})


usersRouter.delete('/', async (req, res, next) => {
    const token = extractToken(req)
    const decodedToken = jwt.verify(token, process.env.SECRET)
    if(!token || !decodedToken){
        return res.status(401).json({error: 'invalid token'})
    }

    try{
        await User.findByIdAndRemove(decodedToken.id)
        res.status(204).end()
    }catch(exception){
        next(exception)
    }
})
module.exports = usersRouter