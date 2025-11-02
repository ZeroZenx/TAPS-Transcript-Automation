const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { parseExcelOrJson } = require('../utils/parseExcel');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/upload
router.post('/', upload.single('file'), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: 'No file uploaded' });
		}
		const originalName = req.file.originalname || 'upload';
		const ext = path.extname(originalName).toLowerCase();
		const buffer = req.file.buffer;
		const parsed = await parseExcelOrJson(buffer, ext);
		res.json({ message: 'File parsed successfully', data: parsed });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to parse file', details: String(err && err.message || err) });
	}
});

module.exports = router;


