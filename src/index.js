
const express = require('express')

const app = express()

app.get('/', (req, res) => res.send('server is listening'))

app.listen(3000)
console.log('server is listening on port', 3000)