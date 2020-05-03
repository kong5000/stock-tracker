//Use one of three keys to reduce chance of hitting api limits

const KEYS = [
    process.env.IEX_API_KEY_1,
    process.env.IEX_API_KEY_2,
    process.env.IEX_API_KEY_3,
]

const retrieveKey = () => {
    const randomIndex = Math.floor(Math.random() * KEYS.length)
    return KEYS[randomIndex]
}

exports.retrieveKey = retrieveKey;