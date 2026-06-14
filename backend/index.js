const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');
const path = require('path');
const connectDatabase = require('./db');

app.use(cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'workshops.html'));
});

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

const skyRouter = require('./routes/sky');
app.use('/api/sky', skyRouter);

const stardustRouter = require('./routes/stardust');
app.use('/api/stardust', stardustRouter);

const photosRouter = require('./routes/photos');
app.use('/api/photos', photosRouter);

const sessionsRouter = require('./routes/sessions');
app.use('/api/sessions', sessionsRouter);

const passportRouter = require('./routes/passport');
app.use('/api/passport', passportRouter);

const marketsRouter = require('./routes/markets');
app.use('/api/markets', marketsRouter);

const immersiveRouter = require('./routes/immersive');
app.use('/api/immersive', immersiveRouter);

app.use(express.static(path.join(__dirname, '..', 'frontend')));

const port = process.env.PORT || 3000;

connectDatabase()
    .then(() => {
        app.listen(port, () => {console.log(`Server running on port ${port}`);});
    })
    .catch((error) => {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    });
