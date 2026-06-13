const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Photo = require('../models/Photo');

// Fetch all community astrophotography photos
router.get('/', async (req, res) => {
    try {
        const photos = await Photo.find().sort({ createdAt: -1 });
        res.json(photos);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Upload astrophotography photo metadata
router.post('/upload', async (req, res) => {
    try {
        const { username, title, imageUrl, description, category, location, coordinates, exifData } = req.body;
        if (!username || !title || !imageUrl || !category) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Calculate a deterministic Bortle dark-sky index based on location coords (if provided)
        // Bortle 1 is pristine black sky, Bortle 9 is inner-city light pollution.
        let darkSkyIndex = 5;
        if (coordinates && coordinates.lat && coordinates.lng) {
            const lat = Number(coordinates.lat);
            const lng = Number(coordinates.lng);
            // Deterministic calculation representing a light pollution lookup
            darkSkyIndex = (Math.abs(Math.floor(lat * 17.5 + lng * 23.3)) % 9) + 1;
        }

        // Simulating ISS Pass verification if category is 'ISS'
        let verifiedIssPass = false;
        let bonus = 0;
        if (category === 'ISS') {
            verifiedIssPass = true; // Auto-verify for the hackathon simulation
            bonus = 150;
        }

        const photo = new Photo({
            userId: user._id,
            photographerName: user.username,
            title,
            imageUrl,
            description,
            category,
            location,
            coordinates,
            exifData: exifData || {
                camera: 'Unknown',
                exposure: 'Unknown',
                iso: 0,
                focalLength: 'Unknown'
            },
            darkSkyIndex,
            verifiedIssPass
        });

        await photo.save();

        // If verified ISS pass, reward bonus Stardust
        if (bonus > 0) {
            user.stardustBalance += bonus;
            user.ledger.push({
                type: 'EARN',
                amount: bonus,
                description: `Verified ISS pass astrophotography bonus for "${title}"`
            });
            await user.save();
        }

        res.json({
            message: 'Photo uploaded successfully!' + (bonus > 0 ? ` Earned ${bonus} bonus Stardust for verified ISS capture!` : ''),
            photo,
            stardustBalance: user.stardustBalance
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Tip Stardust to a photo
router.post('/tip', async (req, res) => {
    try {
        const { tipperUsername, photoId, amount } = req.body;
        if (!tipperUsername || !photoId || !amount || Number(amount) <= 0) {
            return res.status(400).json({ message: 'Missing tip parameters' });
        }

        const tipAmount = Number(amount);

        const tipper = await User.findOne({ username: tipperUsername });
        if (!tipper) {
            return res.status(404).json({ message: 'Tipper user not found' });
        }

        if (tipper.stardustBalance < tipAmount) {
            return res.status(400).json({ message: 'Insufficient Stardust balance' });
        }

        const photo = await Photo.findById(photoId);
        if (!photo) {
            return res.status(404).json({ message: 'Photo not found' });
        }

        const photographer = await User.findById(photo.userId);
        if (!photographer) {
            return res.status(404).json({ message: 'Photographer user not found' });
        }

        // Prevent tipping yourself
        if (tipper._id.toString() === photographer._id.toString()) {
            return res.status(400).json({ message: 'You cannot tip your own photo' });
        }

        // Update balances and ledger
        tipper.stardustBalance -= tipAmount;
        tipper.ledger.push({
            type: 'SPEND',
            amount: tipAmount,
            description: `Tipped ${tipAmount} Stardust to ${photographer.username} for "${photo.title}"`
        });
        await tipper.save();

        photographer.stardustBalance += tipAmount;
        photographer.ledger.push({
            type: 'GIFT',
            amount: tipAmount,
            description: `Received tip of ${tipAmount} Stardust from ${tipper.username} for your photo "${photo.title}"`
        });
        await photographer.save();

        photo.stardustTips += tipAmount;
        await photo.save();

        res.json({
            message: `Successfully tipped ${tipAmount} Stardust to ${photographer.username}!`,
            tipperBalance: tipper.stardustBalance,
            photoTips: photo.stardustTips
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
