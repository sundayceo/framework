type ExtractedSlots = {
	slots: string[];
	requiredSlots: string[];
};

type ValidationError = {
	type: "missing-required-slot";
	slotName: string;
	message: string;
};

type ValidationWarning = {
	type: "unknown-slot";
	slotName: string;
	message: string;
};

export type ValidationResult = {
	errors: ValidationError[];
	warnings: ValidationWarning[];
};

type ValidateSlotsInput = {
	providedSlots: string[];
	extractedSlots: ExtractedSlots;
};

function levenshtein(a: string, b: string): number {
	const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
	const curr = new Array<number>(b.length + 1);

	for (let i = 1; i <= a.length; i++) {
		curr[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
			curr[j] = Math.min(
				(prev.at(j) ?? 0) + 1,
				(curr.at(j - 1) ?? 0) + 1,
				(prev.at(j - 1) ?? 0) + cost,
			);
		}
		for (let j = 0; j <= b.length; j++) {
			prev[j] = curr.at(j) ?? 0;
		}
	}

	return prev.at(b.length) ?? 0;
}

function findClosestSlot(name: string, candidates: string[]): string | undefined {
	let bestMatch: string | undefined;
	let bestDistance = Infinity;
	const threshold = Math.max(2, Math.floor(name.length / 2));

	for (const candidate of candidates) {
		const distance = levenshtein(name, candidate);
		if (distance < bestDistance && distance <= threshold) {
			bestDistance = distance;
			bestMatch = candidate;
		}
	}

	return bestMatch;
}

export function validateSlots(input: ValidateSlotsInput): ValidationResult {
	const { providedSlots, extractedSlots } = input;
	const errors: ValidationError[] = [];
	const warnings: ValidationWarning[] = [];

	const providedSet = new Set(providedSlots);
	const knownSet = new Set(extractedSlots.slots);

	for (const required of extractedSlots.requiredSlots) {
		if (!providedSet.has(required)) {
			errors.push({
				type: "missing-required-slot",
				slotName: required,
				message: `Required slot "${required}" is missing`,
			});
		}
	}

	for (const provided of providedSlots) {
		if (!knownSet.has(provided)) {
			const suggestion = findClosestSlot(provided, extractedSlots.slots);

			if (suggestion !== undefined) {
				warnings.push({
					type: "unknown-slot",
					slotName: provided,
					message: `Unknown slot "${provided}" provided. Did you mean "${suggestion}"?`,
				});
			} else {
				const available = extractedSlots.slots.map((s) => `"${s}"`).join(", ");
				warnings.push({
					type: "unknown-slot",
					slotName: provided,
					message: `Unknown slot "${provided}" provided. Available slots: ${available}`,
				});
			}
		}
	}

	return { errors, warnings };
}
