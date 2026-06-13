const express = require('express');
const app = express();
require('dotenv').config();

// Enable CORS middleware
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

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

const userRouter = require('./routes/user');
app.use('/api/user', userRouter);

const passportRouter = require('./routes/passport');
app.use('/api/passport', passportRouter);

const sessionRouter = require('./routes/session');
app.use('/api/sessions', sessionRouter);

const photoRouter = require('./routes/photo');
app.use('/api/photos', photoRouter);

const gameRouter = require('./routes/game');
app.use('/api/game', gameRouter);

const connectDB = require('./db');
connectDB();

app.listen(3000, () => {console.log('Server running on port 3000');})