const Photo = require('../models/Photo');
const Session = require('../models/Session');
const { inferSessionStart } = require('./sessionTiming');

const PHOTO_SEEDS = [
    {
        title: 'Orion Nebula in Infrared',
        category: 'nebula',
        authorName: 'NASA/ESA/JPL-Caltech',
        description: 'Infrared view of the Orion Nebula showing dust cavities and new star formation.',
        imageUrl: 'https://images-assets.nasa.gov/image/PIA25434/PIA25434~medium.jpg',
        fullImageUrl: 'https://images-assets.nasa.gov/image/PIA25434/PIA25434~large.jpg',
        sourceType: 'nasa',
        capturedAtLabel: 'Nov 22, 2022',
        stardustTotal: 842,
        giftCount: 23,
        featured: true,
    },
    {
        title: 'Aurora Australis from the ISS',
        category: 'aurora',
        authorName: 'NASA/JSC',
        description: 'An auroral curtain photographed from the ISS shortly after orbital sunset.',
        imageUrl: 'https://images-assets.nasa.gov/image/iss006e28961/iss006e28961~medium.jpg',
        fullImageUrl: 'https://images-assets.nasa.gov/image/iss006e28961/iss006e28961~large.jpg',
        sourceType: 'nasa',
        capturedAtLabel: 'Feb 16, 2003',
        stardustTotal: 536,
        giftCount: 14,
    },
    {
        title: 'Nearside of the Moon',
        category: 'moon',
        authorName: 'ISRO/NASA/JPL-Caltech/Brown Univ.',
        description: 'Detailed Chandrayaan-1-based map of the lunar nearside.',
        imageUrl: 'https://images-assets.nasa.gov/image/PIA12235/PIA12235~medium.jpg',
        fullImageUrl: 'https://images-assets.nasa.gov/image/PIA12235/PIA12235~orig.jpg',
        sourceType: 'isro',
        capturedAtLabel: 'Sep 24, 2009',
        stardustTotal: 688,
        giftCount: 16,
    },
];

const SESSION_SEEDS = [
    {
        hostName: 'Mira',
        title: 'Moonrise Watch',
        description: 'A relaxed telescope meetup for lunar viewing and beginner photography.',
        place: 'East Ridge Field',
        timeLabel: 'Tonight, 8:30 PM',
        seatsLabel: '12 spots',
        capacity: 12,
        cost: 35,
        location: { name: 'East Ridge Field', description: 'Hilltop clearing', lat: 14.5832, lng: 121.0 },
        fundingPool: { enabled: true, type: 'experience', goal: 600, raised: 240, currency: 'INR' },
        participants: [
            { name: 'Mira', initials: 'MI', bringing: 'Dobsonian telescope' },
            { name: 'Dev', initials: 'DV', bringing: 'Tripod and moon filter' },
        ],
        skyContext: {
            eventLabel: 'Moonrise + bright ISS pass',
            moonPhase: 'Waxing Gibbous',
            visibility: 'High western visibility after 8:15 PM',
        },
    },
    {
        hostName: 'Isha',
        title: 'Meteor Shower Hangout',
        description: 'Bring a blanket. We will track the radiant and compare sightings.',
        place: 'North Lake Deck',
        timeLabel: 'Saturday, 11:00 PM',
        seatsLabel: '8 spots',
        capacity: 8,
        cost: 50,
        location: { name: 'North Lake Deck', description: 'Dark sky lakeside deck', lat: 13.0827, lng: 80.2707 },
        fundingPool: { enabled: true, type: 'host', goal: 850, raised: 390, currency: 'INR' },
        participants: [
            { name: 'Isha', initials: 'IS', bringing: 'Blankets and warm tea' },
            { name: 'Rohit', initials: 'RH', bringing: 'Red flashlights' },
        ],
        skyContext: {
            eventLabel: 'Meteor shower peak',
            moonPhase: 'New Moon',
            visibility: 'Best viewing after midnight',
        },
    },
];

async function ensureDemoContent() {
    await Promise.all([
        reconcileSeedPhotos(),
        reconcileSeedSessions(),
    ]);
}

async function reconcileSeedPhotos() {
    for (const seed of PHOTO_SEEDS) {
        const matches = await Photo.find({
            title: seed.title,
            sourceType: seed.sourceType,
        }).sort({ createdAt: 1 });

        if (matches.length > 1) {
            await Photo.deleteMany({
                _id: { $in: matches.slice(1).map(item => item._id) },
            });
        }

        if (matches.length === 0) {
            await Photo.create(seed);
        }
    }
}

async function reconcileSeedSessions() {
    for (const seed of SESSION_SEEDS) {
        const startsAt = inferSessionStart(seed.timeLabel);
        const matches = await Session.find({
            hostUserId: null,
            title: seed.title,
            place: seed.place,
            timeLabel: seed.timeLabel,
        }).sort({ createdAt: 1 });

        if (matches.length > 1) {
            await Session.deleteMany({
                _id: { $in: matches.slice(1).map(item => item._id) },
            });
        }

        if (matches.length === 0) {
            await Session.create({
                ...seed,
                startsAt,
            });
            continue;
        }

        const primary = matches[0];
        const currentStartsAt = primary.startsAt ? new Date(primary.startsAt).getTime() : NaN;
        const nextStartsAt = startsAt ? startsAt.getTime() : NaN;
        if (currentStartsAt !== nextStartsAt) {
            primary.startsAt = startsAt;
            await primary.save();
        }
    }
}

module.exports = {
    ensureDemoContent,
};
