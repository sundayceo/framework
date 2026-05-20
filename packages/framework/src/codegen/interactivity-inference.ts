const REACT_HOOKS = [
	"useState",
	"useEffect",
	"useLayoutEffect",
	"useInsertionEffect",
	"useRef",
	"useReducer",
	"useCallback",
	"useMemo",
	"useContext",
	"useId",
	"useDeferredValue",
	"useImperativeHandle",
	"useSyncExternalStore",
	"useTransition",
	"useActionState",
	"useOptimistic",
	"useFormStatus",
];

const HOOK_PATTERN = new RegExp(`\\b(${REACT_HOOKS.join("|")})\\s*\\(`);
const EVENT_HANDLER_PATTERN = /\bon[A-Z][a-zA-Z]*\s*=\s*\{/;
const BROWSER_API_PATTERN = /\b(window\.|document\.|addEventListener\s*\(|navigator\.)/;

function hasInteractivitySignals(source: string): boolean {
	return (
		HOOK_PATTERN.test(source) ||
		EVENT_HANDLER_PATTERN.test(source) ||
		BROWSER_API_PATTERN.test(source)
	);
}

function extractImportSpecifiers(source: string): string[] {
	const specifiers: string[] = [];
	const importRegex = /\bimport\s+(type\s+)?.*?\s+from\s+["']([^"']+)["']/g;
	let match;

	while ((match = importRegex.exec(source)) !== null) {
		if (match.at(1) === undefined) {
			/* v8 ignore next */
			specifiers.push(match.at(2) ?? "");
		}
	}

	return specifiers;
}

/** Returns true if the source or its transitive imports contain React hooks, event handlers, or browser APIs. */
export function isInteractive(source: string, importGraph: Record<string, string> = {}): boolean {
	if (hasInteractivitySignals(source)) {
		return true;
	}

	const visited = new Set<string>();
	const specifiers = extractImportSpecifiers(source);

	function checkTransitive(specifier: string): boolean {
		if (visited.has(specifier)) {
			return false;
		}

		visited.add(specifier);

		const depSource = importGraph[specifier];

		if (depSource === undefined) {
			return false;
		}

		if (hasInteractivitySignals(depSource)) {
			return true;
		}

		const childSpecifiers = extractImportSpecifiers(depSource);

		return childSpecifiers.some(checkTransitive);
	}

	return specifiers.some(checkTransitive);
}
