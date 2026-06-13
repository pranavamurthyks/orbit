const express = require('express');
const app = express();
require('dotenv').config();

app.use(express.json());

app.get('/', 
    (req, res) => {res.json({message: 'Orbit backend running'});}
)

const summary_router = require('./routes/summary');
app.use('/api/summary', summary_router);

const feed_router = require('./routes/feed');
app.use('/api/feed', feed_router);

const issRouter = require('./routes/iss');
app.use('/api/iss', issRouter);

app.listen(3000, () => {console.log('Server running on port 3000');})