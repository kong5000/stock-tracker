const stocksRouter = require('express').Router()
const Stock = require('../models/stock')


stocksRouter.get('/', (req, res) => {
    res.send('<h1>Hello World!!</h1>')
})

stocksRouter.get('/api/stocks', (req, res) => {
    console.log('Get Request made')
    res.json(stocks)
})

stocksRouter.get('/api/stocks/:id', (req, res, next) => {
    Stock.findById(req.params.id)
        .then(
            stock => {
                if(stock){
                    res.json(stock.toJSON())
                }else{
                    res.status(404).end()
                }

            }
        )
        .catch(error => {
            //next called with parameter goes to error handler middleware
            next(error)
        })
})

stocksRouter.delete('/api/stocks/:id', (req, res) => {
    const id = Number(req.params.id)
    Stock.findByIdAndRemove(req.params.id)
    .then(result => {
        res.status(204).end()
    })
    .catch(error => next(error))
})


stocksRouter.post('/api/stocks', (req, res, next) => {
    const body = req.body

    const stock = new Stock({
        ticker: body.ticker,
        name: body.name,
        shares: body.shares,
        price: body.price,
        costBasis: body.price * body.shares,
        date: body.date || new Date(),
    })

    stock.save().then(savedStock => {
        res.json(savedStock.toJSON())
    })
    .catch(error => next(error))
})

stocksRouter.put('/api/stocks/:id', (req, res, next) => {
    const body = req.body
    const stock = {
        ticker: body.ticker,
        name: body.name,
        shares: body.shares,
        price: body.price,
        costBasis: body.costBasis,
    }

    Stock.findByIdAndUpdate(req.params.id, stock, {new: true})
    .then(updatedStock => {
        res.json(updatedStock)
    })
    .catch(error => next(error))
})

module.exports = stocksRouter