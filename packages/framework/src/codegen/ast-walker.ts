/* eslint-disable @typescript-eslint/consistent-type-assertions -- Babel parser returns untyped AST; casts are unavoidable */

export type AstNode = {
	type: string;
	start?: number | null;
	end?: number | null;
	[key: string]: unknown;
};

export function sliceNode(node: AstNode, source: string): string {
	return source.slice(node.start ?? 0, node.end ?? source.length);
}

function isAstLike(value: unknown): value is AstNode {
	return typeof value === "object" && value !== null && typeof (value as AstNode).type === "string";
}

export function walkNode(node: unknown, callback: (n: AstNode) => boolean | undefined): void {
	if (!isAstLike(node)) {
		return;
	}
	if (callback(node) === true) {
		return;
	}
	for (const value of Object.values(node)) {
		if (Array.isArray(value)) {
			for (const item of value) {
				walkNode(item, callback);
			}
		} else if (isAstLike(value)) {
			walkNode(value, callback);
		}
	}
}

export function findParentOf(root: AstNode, target: AstNode): AstNode | null {
	let found: AstNode | null = null;
	walkNode(root, (node) => {
		if (found !== null) {
			return true;
		}
		for (const value of Object.values(node)) {
			if (value === target || (Array.isArray(value) && value.includes(target))) {
				found = node;
				return true;
			}
		}
		return undefined;
	});
	return found;
}

function nodeName(n: AstNode): string {
	return (n as AstNode & { name: string }).name;
}

function isReferencedIdentifier(n: AstNode, root: AstNode): boolean {
	const parent = findParentOf(root, n);
	if (parent === null) {
		return true;
	}
	if (parent.type === "MemberExpression" && parent.property === n) {
		return false;
	}
	if (parent.type === "ObjectProperty" && parent.key === n) {
		return false;
	}
	return true;
}

function isReferencedJsxComponent(n: AstNode, root: AstNode): boolean {
	const parent = findParentOf(root, n);
	return (
		parent !== null &&
		parent.type === "JSXOpeningElement" &&
		parent.name === n &&
		/^[A-Z]/.test(nodeName(n))
	);
}

const GLOBAL_NAMES = new Set(["React", "undefined", "null", "true", "false", "console"]);

export function collectReferencedIdentifiers(node: AstNode): Set<string> {
	const identifiers = new Set<string>();

	walkNode(node, (n) => {
		if (n.type === "Identifier" && isReferencedIdentifier(n, node)) {
			identifiers.add(nodeName(n));
		}
		if (n.type === "JSXIdentifier" && isReferencedJsxComponent(n, node)) {
			identifiers.add(nodeName(n));
		}
		return undefined;
	});

	for (const name of GLOBAL_NAMES) {
		identifiers.delete(name);
	}
	return identifiers;
}

function collectPatternNames(node: AstNode, out: string[]): void {
	if (node.type === "Identifier") {
		out.push(nodeName(node));
		return;
	}
	if (node.type === "AssignmentPattern") {
		collectPatternNames(node.left as AstNode, out);
		return;
	}
	if (node.type === "ObjectPattern") {
		const properties = node.properties as AstNode[];
		for (const prop of properties) {
			if (prop.type === "ObjectProperty") {
				collectPatternNames(prop.value as AstNode, out);
			} else if (prop.type === "RestElement") {
				collectPatternNames(prop.argument as AstNode, out);
			}
		}
		return;
	}
	if (node.type === "ArrayPattern") {
		const elements = node.elements as (AstNode | null)[];
		for (const el of elements) {
			if (el !== null) {
				collectPatternNames(el, out);
			}
		}
	}
}

export function extractDeclNames(stmt: AstNode): string[] {
	const names: string[] = [];
	const declarations = stmt.declarations as AstNode[];
	for (const decl of declarations) {
		collectPatternNames(decl.id as AstNode, names);
	}
	return names;
}
