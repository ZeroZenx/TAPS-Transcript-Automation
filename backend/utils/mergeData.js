const path = require('path');
const fs = require('fs');

function safeNumber(v) {
	if (v === null || v === undefined || v === '') return 0;
	const n = Number(String(v).toString().replace(/[^0-9.-]/g, ''));
	return Number.isFinite(n) ? n : 0;
}

// Attempts to normalize banner raw JSON into structured term rows
async function mergeBannerData(bannerRaw, options = {}) {
	const meansRate = typeof options.meansRate === 'number' ? options.meansRate : 1;

	// If an object with sheet names is provided (from XLSX), try precise parsing
	if (bannerRaw && !Array.isArray(bannerRaw) && typeof bannerRaw === 'object') {
		const sheets = bannerRaw;
		const shacrs = Array.isArray(sheets.SHACRSE) ? sheets.SHACRSE : [];
		const tsaarev = Array.isArray(sheets.TSAAREV) ? sheets.TSAAREV : [];
		const refundReq = Array.isArray(sheets['Refund Request']) ? sheets['Refund Request'] : [];

		if (shacrs.length || tsaarev.length) {
			// Group credits by TERM from SHACRSE
			const termToCredits = new Map();
			shacrs.forEach((row) => {
				const term = String(row['Unnamed:0'] || row['TERM'] || '').trim();
				if (!/\b\d{6}\b/.test(term)) return;
				const credits = safeNumber(row['Unnamed:9'] ?? row['CREDITS']);
				const level = String(row['Unnamed:6'] || row['LEVEL'] || '').toUpperCase();
				const subject = String(row['Unnamed:2'] || row['SUBJ'] || '').toUpperCase();
				const isUndergrad = level.includes('UG');
				const isCompass = subject === 'CE' || subject === 'CS' || subject.includes('COMPASS');
				const key = term;
				const agg = termToCredits.get(key) || { credits: 0, ug: 0, compass: 0, repeated: 0 };
				agg.credits += credits;
				if (isUndergrad) agg.ug += credits;
				if (isCompass) agg.compass += credits;
				// Naive repeat detection placeholder (needs course history):
				// if (row['REPEAT'] === 'Y') agg.repeated += credits;
				termToCredits.set(key, agg);
			});

			// Group charges/payments by TERM from TSAAREV
			const termToFinance = new Map();
			tsaarev.forEach((row) => {
				const term = String(row['Unnamed:1'] || row['TERM'] || '').trim();
				const code = String(row['Unnamed:0'] || row['CODE'] || '').toUpperCase();
				const amount = safeNumber(row['Unnamed:4'] ?? row['AMOUNT']);
				if (!/\b\d{6}\b/.test(term)) return;
				const fin = termToFinance.get(term) || { tuitionCharged: 0, gate: 0, studentPaid: 0 };
				const isGate = code.includes('GATE');
				const isCharge = amount > 0; // simplistic: positive = charge, negative = payment
				if (isCharge) {
					fin.tuitionCharged += amount;
				} else {
					if (isGate) fin.gate += Math.abs(amount); else fin.studentPaid += Math.abs(amount);
				}
				termToFinance.set(term, fin);
			});

			// Build rows by term union
			const allTerms = new Set([...termToCredits.keys(), ...termToFinance.keys()]);
			const rows = Array.from(allTerms).map((term) => {
				const c = termToCredits.get(term) || { credits: 0, ug: 0, compass: 0, repeated: 0 };
				const f = termToFinance.get(term) || { tuitionCharged: 0, gate: 0, studentPaid: 0 };
				const ratePerCredit = 300; // baseline; replace with exact table if available
				const totalTuition = f.tuitionCharged || c.credits * ratePerCredit;
				const unpaid = Math.max(0, totalTuition - (f.gate + f.studentPaid));
				return normalizeRow({
					TERM: term,
					CREDITS: c.credits,
					'UNDERGRAD CREDITS': c.ug,
					'COMPASS CREDITS': c.compass,
					'REPEATED CREDITS': c.repeated,
					'MEANS RATE': `${Math.round(meansRate * 100)}%`,
					'TOTAL TUITION CHARGED': totalTuition,
					'GATE CONTRIBUTION ': f.gate,
					'TUITION PAID BY GATE': f.gate,
					'TUITION PAID BY STUDENT': f.studentPaid,
					'UNPAID COLLEGE FEES': unpaid,
					'COMMENTS AND TOTAL OUTSTANDING': '',
					'TOTAL TO BE PAID BY GATE ': 0,
					'TOTAL TO BE PAID BY  STUDENT': unpaid,
					'UNDERGRAD TUITION': c.ug * ratePerCredit,
					'COMPASS CREDITS TUITION': c.compass * ratePerCredit,
					'REPEATED CREDITS TUITION': c.repeated * ratePerCredit
				});
			});
			return buildSheetsFromRows(rows);
		}
	}

	// If the provided raw looks like our sample quick grid (final_grid_sample.json 5.json), use it directly
	if (Array.isArray(bannerRaw) && bannerRaw.length && bannerRaw[0] && bannerRaw[0].TERM) {
		const rows = bannerRaw.map((r) => normalizeRow(r));
		return buildSheetsFromRows(rows);
	}

	// Heuristic: try to map known keys from `banner_raw.json.json` to compact rows
	let quickRows = [];
	try {
		if (Array.isArray(bannerRaw)) {
			// Detect lines that look like terms (e.g., 201310) and credit values in the second column
			bannerRaw.forEach((row) => {
				const k = Object.keys(row || {});
				if (!k.length) return;
				const left = row[k[0]];
				const mid = row[k[1]];
				if (typeof left === 'string' && /\b\d{6}\b/.test(left)) {
					const termCode = left;
					const credits = safeNumber(mid);
					const undergradCredits = credits; // assume all UG for baseline
					const compassCredits = 0;
					const repeatedCredits = 0;
					const ratePerCredit = 300; // baseline rate (example)
					const totalTuition = credits * ratePerCredit;
					const gateContribution = 0; // will adjust later if inputs indicate GATE
					const paidByGate = gateContribution;
					const paidByStudent = 0;
					const unpaid = Math.max(0, totalTuition - (paidByGate + paidByStudent));
					quickRows.push({
						TERM: termCode,
						CREDITS: credits,
						'UNDERGRAD CREDITS': undergradCredits,
						'COMPASS CREDITS': compassCredits,
						'REPEATED CREDITS': repeatedCredits,
						'MEANS RATE': `${Math.round(meansRate * 100)}%`,
						'TOTAL TUITION CHARGED': totalTuition,
						'GATE CONTRIBUTION ': gateContribution,
						'TUITION PAID BY GATE': paidByGate,
						'TUITION PAID BY STUDENT': paidByStudent,
						'UNPAID COLLEGE FEES': unpaid,
						'COMMENTS AND TOTAL OUTSTANDING': '',
						'TOTAL TO BE PAID BY GATE ': 0,
						'TOTAL TO BE PAID BY  STUDENT': unpaid,
						'UNDERGRAD TUITION': undergradCredits * ratePerCredit,
						'COMPASS CREDITS TUITION': 0,
						'REPEATED CREDITS TUITION': 0
					});
				}
			});
		}
	} catch (e) {
		// fallthrough to sample
	}

	if (!quickRows.length) {
		// fallback to shipping a sample aligned with final_grid_sample.json 5.json
		const samplePath = path.join(__dirname, '../../data/final_grid_sample.json 5.json');
		if (fs.existsSync(samplePath)) {
			quickRows = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
		}
	}

	const rows = quickRows.map((r) => normalizeRow(r));
	return buildSheetsFromRows(rows);
}

function normalizeRow(r) {
	const n = {
		TERM: String(r.TERM || r.term || '').trim(),
		CREDITS: safeNumber(r.CREDITS || r.credits),
		'UNDERGRAD CREDITS': safeNumber(r['UNDERGRAD CREDITS'] || r.undergradCredits),
		'COMPASS CREDITS': safeNumber(r['COMPASS CREDITS'] || r.compassCredits),
		'REPEATED CREDITS': safeNumber(r['REPEATED CREDITS'] || r.repeatedCredits),
		'MEANS RATE': String(r['MEANS RATE'] || r.meansRate || ''),
		'TOTAL TUITION CHARGED': safeNumber(r['TOTAL TUITION CHARGED'] || r.totalTuition),
		'GATE CONTRIBUTION ': safeNumber(r['GATE CONTRIBUTION '] || r.gateContribution),
		'TUITION PAID BY GATE': safeNumber(r['TUITION PAID BY GATE'] || r.tuitionPaidByGate),
		'TUITION PAID BY STUDENT': safeNumber(r['TUITION PAID BY STUDENT'] || r.tuitionPaidByStudent),
		'UNPAID COLLEGE FEES': safeNumber(r['UNPAID COLLEGE FEES'] || r.unpaidCollegeFees),
		'COMMENTS AND TOTAL OUTSTANDING': String(r['COMMENTS AND TOTAL OUTSTANDING'] || r.comments || ''),
		'TOTAL TO BE PAID BY GATE ': safeNumber(r['TOTAL TO BE PAID BY GATE '] || r.totalToBePaidByGate),
		'TOTAL TO BE PAID BY  STUDENT': safeNumber(r['TOTAL TO BE PAID BY  STUDENT'] || r.totalToBePaidByStudent),
		'UNDERGRAD TUITION': safeNumber(r['UNDERGRAD TUITION'] || r.undergradTuition),
		'COMPASS CREDITS TUITION': safeNumber(r['COMPASS CREDITS TUITION'] || r.compassTuition),
		'REPEATED CREDITS TUITION': safeNumber(r['REPEATED CREDITS TUITION'] || r.repeatedTuition)
	};
	return n;
}

function buildSheetsFromRows(rows) {
	// Build six tabs: CREDITS, GATE, BANNER, SUMMARY, QUICK GRID, STATUS
	const quickGrid = rows;

	// Credits sheet: term + credits + comments
	const creditsSheet = [ { CREDITS: 'TERM', '': 'COMMENTS' } ];
	rows.forEach((r) => {
		creditsSheet.push({ CREDITS: r.TERM, '': r['COMMENTS AND TOTAL OUTSTANDING'] || '' });
	});

	// Gate & Banner placeholder lists of terms (structure reference)
	const gateSheet = [ { GATE: 'TERM', '': '' } ];
	const bannerSheet = [ { BANNER: 'TERM', '': '' } ];
	rows.forEach((r) => {
		gateSheet.push({ GATE: r.TERM, '': '' });
		bannerSheet.push({ BANNER: r.TERM, '': '' });
	});

	// Summary aggregations
	const totals = rows.reduce((acc, r) => {
		acc.totalTuition += safeNumber(r['TOTAL TUITION CHARGED']);
		acc.totalGate += safeNumber(r['TUITION PAID BY GATE']);
		acc.totalStudent += safeNumber(r['TUITION PAID BY STUDENT']);
		acc.totalUnpaid += safeNumber(r['UNPAID COLLEGE FEES']);
		return acc;
	}, { totalTuition: 0, totalGate: 0, totalStudent: 0, totalUnpaid: 0 });

	const summary = {
		totalTuition: totals.totalTuition,
		totalGate: totals.totalGate,
		totalStudent: totals.totalStudent,
		totalUnpaid: totals.totalUnpaid
	};

	// Status choices from sample file if available
	let statusSheet = [];
	const statusPath = path.join(__dirname, '../../data/final_grid_sample.json 6.json');
	if (fs.existsSync(statusPath)) {
		statusSheet = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
	} else {
		statusSheet = [
			{ 'Assignment Setup': 'COMMENTS AND TOTAL OUTSTANDING', '': '', '< TO DO LIST': '' },
			{ 'Assignment Setup': 'Finance Approved', '': '', '< TO DO LIST': '' },
			{ 'Assignment Setup': 'Gate Processing', '': '', '< TO DO LIST': '' },
			{ 'Assignment Setup': 'Payment Required', '': '', '< TO DO LIST': '' }
		];
	}

	return {
		creditsSheet,
		gateSheet,
		bannerSheet,
		summary,
		quickGrid,
		statusSheet
	};
}

module.exports = { mergeBannerData };


