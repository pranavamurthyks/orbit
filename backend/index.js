const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');
const connectDatabase = require('./db');

app.use(cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
}));
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

const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

const otpRouter = require('./routes/otp');
app.use('/api/otp', otpRouter);

const port = process.env.PORT || 3000;

connectDatabase()
    .then(() => {
        app.listen(port, () => {console.log(`Server running on port ${port}`);});
    })
    .catch((error) => {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    });
