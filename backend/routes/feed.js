const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/', 
    async (req, res) => 
{
    try
    {
        const response = await axios.get('https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=10&format=json');
        res.json(response.data);
    }
    catch (error)
    {
        res.status(500).json({message: 'Failed to fetch launches'});
    }
});

module.exports = router;