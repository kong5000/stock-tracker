const stocksRouter = require('express').Router()
const Stock = require('../models/stock')


stocksRouter.get('/', (req, res) => {
    res.send('<h1>Hello World!!</h1>')
})

stocksRouter.get('/api/stocks', async (req, res, next) => {
    try{
        const stocks = await Stock.find({})
        res.json(stocks)
    }catch(exception){
        next(exception)
    }
})

stocksRouter.get('/api/stocks/:id', async (req, res, next) => {
    try {
        const stock = await Stock.findById(req.params.id)
        if (stock) {
            res.json(stock.toJSON())
        } else {
            res.status(404).end()
        }
    } catch(exception){
        next(exception)
    }
})

stocksRouter.delete('/api/stocks/:id', async (req, res, next) => {
    const id =req.params.id
    try{
        await Stock.findByIdAndRemove(id)
        res.status(204).end()
    }catch(exception){
        next(exception)
    }
})


stocksRouter.post('/api/stocks', async (req, res, next) => {
    const body = req.body

    const stock = new Stock({
        ticker: body.ticker,
        name: body.name,
        shares: body.shares,
        price: body.price,
        costBasis: body.price * body.shares,
        date: body.date || new Date(),
    })
    try{
        const savedStock = await stock.save()
        res.json(savedStock.toJSON())
    }catch(exception){
        next(exception)
    }
})

stocksRouter.put('/api/stocks/:id', async (req, res, next) => {
    const body = req.body
    const stock = {
        ticker: body.ticker,
        name: body.name,
        shares: body.shares,
        price: body.price,
        costBasis: body.costBasis,
    }
    try{
        //passing in{ new: true} makes findByIdAndUpdate return the newly updated object
        const updatedStock =  await Stock.findByIdAndUpdate(req.params.id, stock, { new: true })
    }catch(exception){
        next(exception)
    }
})

module.exports = stocksRouter