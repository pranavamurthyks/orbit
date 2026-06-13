const express = require('express');
const router = express.Router();
const axios = require('axios');
const Groq = require('groq-sdk');

router.get('/', async (req, res) => {
    try {
        if (!process.env.GROQ_API_KEY) {
            return res.status(500).json({ message: 'GROQ_API_KEY is not configured' });
        }

        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const launchRes = await axios.get('https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=1&format=json');
        const launch = launchRes.data.results[0];

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'user',
                    content: `Summarize this space launch in 3 simple sentences for a beginner: 
                    Name: ${launch.name}, 
                    Date: ${launch.net}, 
                    Mission: ${launch.mission?.description || 'No description available'}`
                }
            ],
            model: 'llama-3.3-70b-versatile',
        });

        const summary = completion.choices[0].message.content;
        res.json({ launch: launch.name, date: launch.net, summary });

    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: 'Failed to generate summary' });
    }
});

module.exports = router;
