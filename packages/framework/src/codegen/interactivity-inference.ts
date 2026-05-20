import { parseImportSpecifiers } from "./parse-imports";

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

/**
 * Resolves an import specifier to its graph key.
 * When `fromFile` is provided, the specifier is relative to that file's directory.
 */
export type SpecifierResolver = (specifier: string, fromFile?: string) => string | undefined;

/** Returns true if the source or its transitive imports contain React hooks, event handlers, or browser APIs. */
export function isInteractive(
	source: string,
	importGraph: Record<string, string> = {},
	resolveSpecifier: SpecifierResolver = (s) => s,
): boolean {
	if (hasInteractivitySignals(source)) {
		return true;
	}

	const visited = new Set<string>();
	const specifiers = parseImportSpecifiers(source);

	function checkTransitive(specifier: string, fromFile?: string): boolean {
		const key = resolveSpecifier(specifier, fromFile);
		if (key === undefined) {
			return false;
		}

		if (visited.has(key)) {
			return false;
		}

		visited.add(key);

		const depSource = importGraph[key];

		if (depSource === undefined) {
			return false;
		}

		if (hasInteractivitySignals(depSource)) {
			return true;
		}

		const childSpecifiers = parseImportSpecifiers(depSource);

		return childSpecifiers.some((child) => checkTransitive(child, key));
	}

	return specifiers.some((s) => checkTransitive(s));
}
