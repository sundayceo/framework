/* eslint-disable @typescript-eslint/consistent-type-assertions, @typescript-eslint/naming-convention, @typescript-eslint/no-non-null-assertion, @typescript-eslint/strict-boolean-expressions */
import _generate from "@babel/generator";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import * as t from "@babel/types";

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
const traverse = ((_traverse as { default?: typeof _traverse }).default ??
	_traverse) as typeof _traverse;
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
const generate = ((_generate as { default?: typeof _generate }).default ??
	_generate) as typeof _generate;

type DefineSlotsResult = {
	slotsObject: t.ObjectExpression;
	fnBody: t.Node;
};

function collectImports(ast: t.File, source: string): Map<string, string> {
	const importMap = new Map<string, string>();
	for (const node of ast.program.body) {
		if (t.isImportDeclaration(node)) {
			const stmt = source.slice(node.start!, node.end!);
			for (const specifier of node.specifiers) {
				importMap.set(specifier.local.name, stmt);
			}
		}
	}
	return importMap;
}

function findDefineSlotsNode(ast: t.File): DefineSlotsResult | null {
	let result: DefineSlotsResult | null = null;

	traverse(ast, {
		ObjectProperty(path) {
			if (!t.isIdentifier(path.node.key, { name: "defineSlots" })) {
				return;
			}
			const fn = path.node.value;
			if (!t.isArrowFunctionExpression(fn) && !t.isFunctionExpression(fn)) {
				return;
			}

			if (t.isArrowFunctionExpression(fn) && t.isObjectExpression(fn.body)) {
				result = { slotsObject: fn.body, fnBody: fn.body };
				path.stop();
				return;
			}

			if (t.isBlockStatement(fn.body)) {
				const returnStmt = fn.body.body.find(
					(s): s is t.ReturnStatement => t.isReturnStatement(s) && t.isObjectExpression(s.argument),
				);
				if (returnStmt) {
					result = {
						slotsObject: returnStmt.argument as t.ObjectExpression,
						fnBody: fn.body,
					};
					path.stop();
				}
			}
		},
	});

	return result;
}

const GLOBAL_NAMES = new Set(["React", "undefined", "null", "true", "false", "console"]);

function collectReferencedIdentifiers(node: t.Node): Set<string> {
	const identifiers = new Set<string>();
	const stmt = t.isExpression(node) ? t.expressionStatement(node) : (node as t.Statement);
	const dummyFile = t.file(t.program([stmt]));

	traverse(dummyFile, {
		Identifier(path) {
			if (t.isMemberExpression(path.parent) && path.parent.property === path.node) {
				return;
			}
			if (t.isObjectProperty(path.parent) && path.parent.key === path.node) {
				return;
			}
			identifiers.add(path.node.name);
		},
		JSXIdentifier(path) {
			const isComponentElement =
				t.isJSXOpeningElement(path.parent) &&
				path.parent.name === path.node &&
				/^[A-Z]/.test(path.node.name);
			if (isComponentElement) {
				identifiers.add(path.node.name);
			}
		},
	});

	for (const name of GLOBAL_NAMES) {
		identifiers.delete(name);
	}
	return identifiers;
}

function addDeclBindings(
	stmt: t.VariableDeclaration,
	source: string,
	locals: Map<string, string>,
): void {
	for (const decl of stmt.declarations) {
		if (t.isIdentifier(decl.id)) {
			locals.set(decl.id.name, source.slice(stmt.start!, stmt.end!));
		}
	}
}

function collectLocalBindings(fnBody: t.Node, source: string): Map<string, string> {
	const locals = new Map<string, string>();
	if (!t.isBlockStatement(fnBody)) {
		return locals;
	}

	for (const stmt of fnBody.body) {
		if (t.isVariableDeclaration(stmt)) {
			addDeclBindings(stmt, source, locals);
		}
	}
	return locals;
}

function resolveImportsForRefs(
	refs: Set<string>,
	imports: Map<string, string>,
	seenImportStmts: Set<string>,
): string[] {
	const result: string[] = [];
	for (const ref of refs) {
		const importStmt = imports.get(ref);
		if (importStmt && !seenImportStmts.has(importStmt)) {
			seenImportStmts.add(importStmt);
			result.push(importStmt);
		}
	}
	return result;
}

type ImportContext = {
	imports: Map<string, string>;
	seenImportStmts: Set<string>;
	requiredImports: string[];
};

function resolveLocalsForRefs(
	refs: Set<string>,
	localBindings: Map<string, string>,
	ctx: ImportContext,
): Map<string, string> {
	const requiredLocals = new Map<string, string>();
	for (const ref of refs) {
		const local = localBindings.get(ref);
		if (local) {
			requiredLocals.set(ref, local);
			const localAst = parse(local, {
				sourceType: "module",
				plugins: ["typescript", "jsx"],
			});
			const firstStmt = localAst.program.body.at(0);
			if (firstStmt) {
				const transitiveImports = resolveImportsForRefs(
					collectReferencedIdentifiers(firstStmt),
					ctx.imports,
					ctx.seenImportStmts,
				);
				ctx.requiredImports.push(...transitiveImports);
			}
		}
	}
	return requiredLocals;
}

function hasLoaderDataUsage(refs: Set<string>, requiredLocals: Map<string, string>): boolean {
	if (refs.has("loaderData")) {
		return true;
	}
	for (const [, localSrc] of requiredLocals) {
		if (localSrc.includes("loaderData")) {
			return true;
		}
	}
	return false;
}

function isFrameworkImport(stmt: string): boolean {
	return stmt.includes("definePage") || stmt.includes("defineHandler");
}

function buildVirtualModule(input: {
	requiredImports: string[];
	requiredLocals: Map<string, string>;
	hasLoaderData: boolean;
	jsxSource: string;
}): string {
	const lines: string[] = [
		'import React from "react";',
		...input.requiredImports.filter((s) => !isFrameworkImport(s)),
		"",
		`export default function HydrateSlot(${input.hasLoaderData ? "{ loaderData }" : ""}) {`,
	];

	for (const [, localSource] of input.requiredLocals) {
		lines.push(`  ${localSource}`);
	}

	lines.push(`  return (${input.jsxSource});`);
	lines.push("}");

	return lines.join("\n");
}

function extractSingleSlot(input: {
	prop: t.ObjectProperty;
	imports: Map<string, string>;
	localBindings: Map<string, string>;
	routePath: string;
}): { key: string; moduleSource: string } | null {
	const { prop, imports, localBindings, routePath } = input;

	if (!t.isIdentifier(prop.key) && !t.isStringLiteral(prop.key)) {
		return null;
	}

	const slotName = t.isIdentifier(prop.key) ? prop.key.name : prop.key.value;
	const jsxSource = generate(prop.value).code;
	const refs = collectReferencedIdentifiers(prop.value);

	const seenImportStmts = new Set<string>();
	const requiredImports = resolveImportsForRefs(refs, imports, seenImportStmts);
	const requiredLocals = resolveLocalsForRefs(refs, localBindings, {
		imports,
		seenImportStmts,
		requiredImports,
	});
	const hasLoaderData = hasLoaderDataUsage(refs, requiredLocals);

	return {
		key: `virtual:hydrate${routePath}/${slotName}`,
		moduleSource: buildVirtualModule({
			requiredImports,
			requiredLocals,
			hasLoaderData,
			jsxSource,
		}),
	};
}

export function extractSlotModules(source: string, routePath: string): Map<string, string> {
	const ast = parse(source, {
		sourceType: "module",
		plugins: ["typescript", "jsx"],
	});

	const imports = collectImports(ast, source);
	const defineSlots = findDefineSlotsNode(ast);

	if (!defineSlots) {
		return new Map();
	}

	const localBindings = collectLocalBindings(defineSlots.fnBody, source);
	const virtualModules = new Map<string, string>();

	for (const prop of defineSlots.slotsObject.properties) {
		if (t.isObjectProperty(prop)) {
			const slot = extractSingleSlot({ prop, imports, localBindings, routePath });
			if (slot) {
				virtualModules.set(slot.key, slot.moduleSource);
			}
		}
	}

	return virtualModules;
}
