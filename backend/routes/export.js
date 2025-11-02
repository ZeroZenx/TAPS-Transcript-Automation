const express = require('express');
const ExcelJS = require('exceljs');
const { generateWorkbook } = require('../utils/generateExcel');

const router = express.Router();

// GET /api/export
// Query expects JSON-serialized payload of processed sheets
router.get('/', async (req, res) => {
	try {
		const payload = req.query && req.query.payload ? JSON.parse(req.query.payload) : null;
		if (!payload) {
			return res.status(400).json({ error: 'Missing payload' });
		}
		const workbook = await generateWorkbook(payload);
		res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
		res.setHeader('Content-Disposition', 'attachment; filename="student_debt_validation.xlsx"');
		await workbook.xlsx.write(res);
		res.end();
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to generate Excel', details: String(err && err.message || err) });
	}
});

module.exports = router;


