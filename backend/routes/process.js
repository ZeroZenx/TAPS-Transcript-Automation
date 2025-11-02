const express = require('express');
const path = require('path');
const fs = require('fs');
const { mergeBannerData } = require('../utils/mergeData');

const router = express.Router();

// POST /api/process
// Body: { bannerData?: object, meansRate?: number }
router.post('/', async (req, res) => {
	try {
		const { bannerData, meansRate } = req.body || {};
		let input = bannerData;
		if (!input) {
			// fallback: try to read sample banner file
			const samplePath = path.join(__dirname, '../../data/banner_raw.json.json');
			if (fs.existsSync(samplePath)) {
				const raw = fs.readFileSync(samplePath, 'utf8');
				input = JSON.parse(raw);
			}
		}
		if (!input) {
			return res.status(400).json({ error: 'No banner data provided' });
		}
		const result = await mergeBannerData(input, { meansRate: typeof meansRate === 'number' ? meansRate : 1 });
		res.json(result);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to process data', details: String(err && err.message || err) });
	}
});

module.exports = router;


