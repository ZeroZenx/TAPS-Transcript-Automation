export type FinancialGrid = {
	term: string;
	credits: number;
	undergradCredits: number;
	compassCredits: number;
	repeatedCredits: number;
	meansRate: string;
	totalTuition: number;
	gateContribution: number;
	tuitionPaidByGate: number;
	tuitionPaidByStudent: number;
	unpaidCollegeFees: number;
	comments?: string;
	totalToBePaidByGate?: number;
	totalToBePaidByStudent?: number;
	undergradTuition?: number;
	compassTuition?: number;
	repeatedTuition?: number;
};

export function toGridRowsFromQuickGrid(quickGrid: any[]): FinancialGrid[] {
	return quickGrid.map((r) => ({
		term: String(r['TERM'] || ''),
		credits: num(r['CREDITS']),
		undergradCredits: num(r['UNDERGRAD CREDITS']),
		compassCredits: num(r['COMPASS CREDITS']),
		repeatedCredits: num(r['REPEATED CREDITS']),
		meansRate: String(r['MEANS RATE'] || ''),
		totalTuition: num(r['TOTAL TUITION CHARGED']),
		gateContribution: num(r['GATE CONTRIBUTION ']),
		tuitionPaidByGate: num(r['TUITION PAID BY GATE']),
		tuitionPaidByStudent: num(r['TUITION PAID BY STUDENT']),
		unpaidCollegeFees: num(r['UNPAID COLLEGE FEES']),
		comments: String(r['COMMENTS AND TOTAL OUTSTANDING'] || ''),
		totalToBePaidByGate: num(r['TOTAL TO BE PAID BY GATE ']),
		totalToBePaidByStudent: num(r['TOTAL TO BE PAID BY  STUDENT']),
		undergradTuition: num(r['UNDERGRAD TUITION']),
		compassTuition: num(r['COMPASS CREDITS TUITION']),
		repeatedTuition: num(r['REPEATED CREDITS TUITION'])
	}));
}

function num(v: unknown): number {
	if (v === null || v === undefined || v === '') return 0;
	const n = Number(String(v).toString().replace(/[^0-9.-]/g, ''));
	return Number.isFinite(n) ? n : 0;
}


