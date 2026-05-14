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
	const matrix: number[][] = [];

	for (let i = 0; i <= a.length; i++) {
		matrix[i] = [i];
	}

	for (let j = 0; j <= b.length; j++) {
		matrix[0][j] = j;
	}

	for (let i = 1; i <= a.length; i++) {
		for (let j = 1; j <= b.length; j++) {
			const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
			matrix[i][j] = Math.min(
				(matrix.at(i - 1)?.[j] ?? 0) + 1,
				(matrix.at(i)?.[j - 1] ?? 0) + 1,
				(matrix.at(i - 1)?.[j - 1] ?? 0) + cost,
			);
		}
	}

	return matrix.at(a.length)?.at(b.length) ?? 0;
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

			if (suggestion) {
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
