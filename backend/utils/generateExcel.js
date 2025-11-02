const ExcelJS = require('exceljs');

async function generateWorkbook(payload) {
	const workbook = new ExcelJS.Workbook();

	// QUICK GRID
	const quick = workbook.addWorksheet('QUICK GRID');
	if (Array.isArray(payload.quickGrid) && payload.quickGrid.length) {
		const columns = Object.keys(payload.quickGrid[0]).map((k) => ({ header: k, key: k }));
		quick.columns = columns;
		payload.quickGrid.forEach((row) => quick.addRow(row));
	}

	// CREDITS
	const credits = workbook.addWorksheet('CREDITS');
	if (Array.isArray(payload.creditsSheet) && payload.creditsSheet.length) {
		const columns = Object.keys(payload.creditsSheet[0]).map((k) => ({ header: k, key: k }));
		credits.columns = columns;
		payload.creditsSheet.forEach((row) => credits.addRow(row));
	}

	// GATE
	const gate = workbook.addWorksheet('GATE');
	if (Array.isArray(payload.gateSheet) && payload.gateSheet.length) {
		const columns = Object.keys(payload.gateSheet[0]).map((k) => ({ header: k, key: k }));
		gate.columns = columns;
		payload.gateSheet.forEach((row) => gate.addRow(row));
	}

	// BANNER
	const banner = workbook.addWorksheet('BANNER');
	if (Array.isArray(payload.bannerSheet) && payload.bannerSheet.length) {
		const columns = Object.keys(payload.bannerSheet[0]).map((k) => ({ header: k, key: k }));
		banner.columns = columns;
		payload.bannerSheet.forEach((row) => banner.addRow(row));
	}

	// SUMMARY
	const summary = workbook.addWorksheet('SUMMARY');
	if (payload.summary) {
		summary.columns = [
			{ header: 'Metric', key: 'metric' },
			{ header: 'Value', key: 'value' }
		];
		summary.addRow({ metric: 'TOTAL TUITION', value: payload.summary.totalTuition });
		summary.addRow({ metric: 'TOTAL GATE', value: payload.summary.totalGate });
		summary.addRow({ metric: 'TOTAL STUDENT', value: payload.summary.totalStudent });
		summary.addRow({ metric: 'TOTAL OUTSTANDING', value: payload.summary.totalUnpaid });
	}

	// STATUS
	const status = workbook.addWorksheet('STATUS');
	if (Array.isArray(payload.statusSheet) && payload.statusSheet.length) {
		const columns = Object.keys(payload.statusSheet[0]).map((k) => ({ header: k, key: k }));
		status.columns = columns;
		payload.statusSheet.forEach((row) => status.addRow(row));
	}

	return workbook;
}

module.exports = { generateWorkbook };


