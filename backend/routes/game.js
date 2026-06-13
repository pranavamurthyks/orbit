const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Prediction = require('../models/Prediction');

// Physics calculation helper
const calculateDilation = (tripType, parameters) => {
    let ratio = 1.0;
    
    if (tripType === 'SPECIAL_RELATIVITY') {
        const v = Number(parameters.speed); // v as fraction of c (e.g. 0.9)
        if (v < 0 || v >= 1) {
            throw new Error('Speed must be between 0 (inclusive) and 1 (exclusive)');
        }
        // Lorentz factor gamma = 1 / sqrt(1 - v^2)
        ratio = 1.0 / Math.sqrt(1.0 - Math.pow(v, 2));
    } else if (tripType === 'GENERAL_RELATIVITY') {
        const r = Number(parameters.distance); // r as multiples of Schwarzschild radius (r_s)
        if (r <= 1.0) {
            throw new Error('Distance must be greater than 1.0 (beyond event horizon)');
        }
        // Gravitational time dilation: t_home = t_ship / sqrt(1 - r_s/r)
        ratio = 1.0 / Math.sqrt(1.0 - (1.0 / r));
    }
    
    return ratio;
};

// Calculate time dilation for a specific trip
router.post('/trip-dilation', (req, res) => {
    try {
        const { tripType, parameters } = req.body;
        if (!tripType || !parameters) {
            return res.status(400).json({ message: 'Missing tripType or parameters' });
        }

        const ratio = calculateDilation(tripType, parameters);
        res.json({
            tripType,
            parameters,
            dilationRatio: ratio
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Helper to get simulated market pools for odds calculation
const getMarketPools = async (targetMetric) => {
    // We fetch actual stakes from the DB, but add default "seed" pools representing other players
    const predictions = await Prediction.find({ targetMetric, resolved: false });
    
    const pools = {
        UP: 1500,
        DOWN: 1000,
        STABLE: 500
    };

    predictions.forEach(p => {
        if (pools[p.predictionValue] !== undefined) {
            pools[p.predictionValue] += p.stardustStake;
        }
    });

    const total = pools.UP + pools.DOWN + pools.STABLE;
    
    return {
        pools,
        total,
        odds: {
            UP: Number((total / pools.UP).toFixed(2)),
            DOWN: Number((total / pools.DOWN).toFixed(2)),
            STABLE: Number((total / pools.STABLE).toFixed(2))
        }
    };
};

// Get live odds for prediction markets
router.get('/odds/:metric', async (req, res) => {
    try {
        const market = await getMarketPools(req.params.metric.toUpperCase());
        res.json(market);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Place a prediction (stakes Stardust)
router.post('/prediction/place', async (req, res) => {
    try {
        const { username, tripType, tripParameters, shipTimeSeconds, targetMetric, predictionValue, stardustStake } = req.body;
        
        if (!username || !tripType || !tripParameters || !shipTimeSeconds || !targetMetric || !predictionValue || !stardustStake) {
            return res.status(400).json({ message: 'Missing prediction parameters' });
        }

        const stake = Number(stardustStake);
        if (stake <= 0) {
            return res.status(400).json({ message: 'Stake must be positive' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.stardustBalance < stake) {
            return res.status(400).json({ message: 'Insufficient Stardust balance' });
        }

        const ratio = calculateDilation(tripType, tripParameters);
        const homeTimeSeconds = Math.round(shipTimeSeconds * ratio);

        // Get current odds before adding this prediction
        const market = await getMarketPools(targetMetric.toUpperCase());
        const oddsAtStake = market.odds[predictionValue.toUpperCase()];

        const prediction = new Prediction({
            userId: user._id,
            tripType,
            tripParameters,
            shipTimeSeconds,
            homeTimeSeconds,
            targetMetric: targetMetric.toUpperCase(),
            predictionValue: predictionValue.toUpperCase(),
            stardustStake: stake,
            oddsAtStake
        });

        await prediction.save();

        // Deduct stake and append to ledger
        user.stardustBalance -= stake;
        user.ledger.push({
            type: 'TRADE_STAKE',
            amount: stake,
            description: `Staked ${stake} Stardust on ${targetMetric} going ${predictionValue} during time-dilation trip`
        });
        await user.save();

        res.json({
            message: 'Prediction placed successfully!',
            prediction,
            stardustBalance: user.stardustBalance
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Resolve a prediction
router.post('/prediction/resolve', async (req, res) => {
    try {
        const { predictionId } = req.body;
        if (!predictionId) {
            return res.status(400).json({ message: 'Prediction ID is required' });
        }

        const prediction = await Prediction.findById(predictionId);
        if (!prediction) {
            return res.status(404).json({ message: 'Prediction not found' });
        }

        if (prediction.resolved) {
            return res.status(400).json({ message: 'Prediction is already resolved' });
        }

        const user = await User.findById(prediction.userId);
        if (!user) {
            return res.status(404).json({ message: 'User associated with prediction not found' });
        }

        // Simulating prediction outcome
        // To give a realistic hackathon feel, we generate a random outcome
        const outcomes = ['UP', 'DOWN', 'STABLE'];
        const actualOutcome = outcomes[Math.floor(Math.random() * outcomes.length)];
        
        const won = (prediction.predictionValue === actualOutcome);
        let payout = 0;
        let ledgerMsg = '';

        if (won) {
            payout = Math.round(prediction.stardustStake * prediction.oddsAtStake);
            user.stardustBalance += payout;
            ledgerMsg = `Won prediction! Metric ${prediction.targetMetric} went ${actualOutcome}. Payout: ${payout} Stardust.`;
            user.ledger.push({
                type: 'TRADE_PAYOUT',
                amount: payout,
                description: ledgerMsg
            });
        } else {
            ledgerMsg = `Lost prediction. Metric ${prediction.targetMetric} went ${actualOutcome} (you predicted ${prediction.predictionValue}).`;
            user.ledger.push({
                type: 'SPEND',
                amount: prediction.stardustStake,
                description: ledgerMsg
            });
        }

        // Add homeTime - shipTime to the user's driftScore (time skipped vs time aged)
        const timeSkipped = Math.max(0, prediction.homeTimeSeconds - prediction.shipTimeSeconds);
        user.driftScore += timeSkipped;

        prediction.resolved = true;
        prediction.won = won;
        await prediction.save();
        await user.save();

        res.json({
            message: won ? 'Congratulations, you won!' : 'Trip completed, prediction lost.',
            won,
            actualOutcome,
            payout,
            driftScoreAdded: timeSkipped,
            stardustBalance: user.stardustBalance,
            driftScoreTotal: user.driftScore,
            prediction
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
