const XLSX = require('xlsx');

async function parseExcelOrJson(buffer, ext) {
	if (ext === '.json') {
		const text = buffer.toString('utf8');
		return JSON.parse(text);
	}
	// default: try XLSX
	const workbook = XLSX.read(buffer, { type: 'buffer' });
	const result = {};
	workbook.SheetNames.forEach((name) => {
		const sheet = workbook.Sheets[name];
		result[name] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
	});
	return result;
}

module.exports = { parseExcelOrJson };


