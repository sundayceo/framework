/* eslint-disable @typescript-eslint/consistent-type-assertions -- Babel parser returns untyped AST; casts are unavoidable */
import { parse } from "@babel/parser";

import {
	collectReferencedIdentifiers,
	extractDeclNames,
	sliceNode,
	walkNode,
	type AstNode,
} from "./ast-walker";
import { assembleSlotModule, type SlotModuleParts } from "./slot-module-assembly";

type DefineSlotsResult = {
	slotsObject: AstNode;
	fnBody: AstNode;
};

type ImportEntry = { statement: string; source: string };

function collectImports(ast: AstNode, source: string): Map<string, ImportEntry> {
	const importMap = new Map<string, ImportEntry>();
	const { body } = (ast as AstNode & { program: { body: AstNode[] } }).program;
	for (const node of body) {
		if (node.type === "ImportDeclaration") {
			const stmt = sliceNode(node, source);
			const importSource = (node.source as AstNode & { value: string }).value;
			const specifiers = node.specifiers as (AstNode & { local: { name: string } })[];
			for (const specifier of specifiers) {
				importMap.set(specifier.local.name, { statement: stmt, source: importSource });
			}
		}
	}
	return importMap;
}

function matchDefineSlots(node: AstNode): AstNode | null {
	if (node.type !== "ObjectProperty") {
		return null;
	}
	const key = node.key as AstNode | undefined;
	if (key?.type !== "Identifier" || (key as AstNode & { name: string }).name !== "defineSlots") {
		return null;
	}
	const fn = node.value as AstNode;
	if (fn.type !== "ArrowFunctionExpression" && fn.type !== "FunctionExpression") {
		return null;
	}
	return fn;
}

function extractBodyFromFn(fn: AstNode): DefineSlotsResult | null {
	const body = fn.body as AstNode;
	if (fn.type === "ArrowFunctionExpression" && body.type === "ObjectExpression") {
		return { slotsObject: body, fnBody: body };
	}
	if (body.type !== "BlockStatement") {
		return null;
	}
	const statements = body.body as AstNode[];
	const returnStmt = statements.find(
		(s) =>
			s.type === "ReturnStatement" && (s.argument as AstNode | null)?.type === "ObjectExpression",
	);
	if (returnStmt === undefined) {
		return null;
	}
	return { slotsObject: returnStmt.argument as AstNode, fnBody: body };
}

function findDefineSlotsNode(ast: AstNode): DefineSlotsResult | null {
	let result: DefineSlotsResult | null = null;

	walkNode(ast, (node) => {
		const fn = matchDefineSlots(node);
		if (fn === null) {
			return undefined;
		}
		result = extractBodyFromFn(fn);
		return result !== null ? true : undefined;
	});

	return result;
}

function collectLocalBindings(fnBody: AstNode, source: string): Map<string, string> {
	const locals = new Map<string, string>();
	if (fnBody.type !== "BlockStatement") {
		return locals;
	}

	const statements = fnBody.body as AstNode[];
	for (const stmt of statements) {
		if (stmt.type === "VariableDeclaration") {
			for (const name of extractDeclNames(stmt)) {
				locals.set(name, sliceNode(stmt, source));
			}
		}
	}
	return locals;
}

function resolveImportsForRefs(
	refs: Set<string>,
	imports: Map<string, ImportEntry>,
	seenImportStmts: Set<string>,
): string[] {
	const result: string[] = [];
	for (const ref of refs) {
		const entry = imports.get(ref);
		if (
			entry !== undefined &&
			entry.source !== "@sundayceo/framework" &&
			!seenImportStmts.has(entry.statement)
		) {
			seenImportStmts.add(entry.statement);
			result.push(entry.statement);
		}
	}
	return result;
}

type ImportContext = {
	imports: Map<string, ImportEntry>;
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
		if (local !== undefined) {
			requiredLocals.set(ref, local);
			const localAst = parse(local, { sourceType: "module", plugins: ["typescript", "jsx"] });
			const firstStmt = (localAst.program.body as AstNode[]).at(0);
			if (firstStmt !== undefined) {
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
		const localAst = parse(localSrc, { sourceType: "module", plugins: ["typescript", "jsx"] });
		const firstStmt = (localAst.program.body as AstNode[]).at(0);
		if (firstStmt !== undefined && collectReferencedIdentifiers(firstStmt).has("loaderData")) {
			return true;
		}
	}
	return false;
}

function extractSingleSlot(input: {
	prop: AstNode;
	source: string;
	imports: Map<string, ImportEntry>;
	localBindings: Map<string, string>;
	routePath: string;
}): { key: string; moduleSource: string; parts: SlotModuleParts } | null {
	const { prop, source, imports, localBindings, routePath } = input;

	const key = prop.key as AstNode;
	if (key.type !== "Identifier" && key.type !== "StringLiteral") {
		return null;
	}

	const slotName =
		key.type === "Identifier"
			? (key as AstNode & { name: string }).name
			: (key as AstNode & { value: string }).value;
	const jsxSource = sliceNode(prop.value as AstNode, source);
	const refs = collectReferencedIdentifiers(prop.value as AstNode);

	const seenImportStmts = new Set<string>();
	const requiredImports = resolveImportsForRefs(refs, imports, seenImportStmts);
	const requiredLocals = resolveLocalsForRefs(refs, localBindings, {
		imports,
		seenImportStmts,
		requiredImports,
	});

	const parts: SlotModuleParts = {
		imports: requiredImports,
		hasLoaderData: hasLoaderDataUsage(refs, requiredLocals),
		locals: [...requiredLocals.values()],
		jsxSource,
	};
	return {
		key: buildSlotKey(routePath, slotName),
		moduleSource: assembleSlotModule(parts),
		parts,
	};
}

/** Builds the canonical key for a route/slot pair (without any virtual-module prefix). */
export function buildSlotKey(routePath: string, slotName: string): string {
	return `${routePath}/${slotName}`;
}

/** Re-exported for consumers that need to inspect slot module internals. */
export type { SlotModuleParts } from "./slot-module-assembly";

/** A compiled slot module with its source code and parsed parts. */
export type SlotModule = { moduleSource: string; parts: SlotModuleParts };

/** Extracts virtual hydration slot modules from a route's defineSlots call. */
export function extractSlotModules(source: string, routePath: string): Map<string, SlotModule> {
	const ast = parse(source, {
		sourceType: "module",
		plugins: ["typescript", "jsx"],
	});

	const imports = collectImports(ast as unknown as AstNode, source);
	const defineSlots = findDefineSlotsNode(ast as unknown as AstNode);

	if (defineSlots === null) {
		return new Map();
	}

	const localBindings = collectLocalBindings(defineSlots.fnBody, source);
	const result = new Map<string, SlotModule>();

	const properties = defineSlots.slotsObject.properties as AstNode[] | undefined;
	if (properties === undefined) {
		return result;
	}

	for (const prop of properties) {
		if (prop.type === "ObjectProperty") {
			const slot = extractSingleSlot({ prop, source, imports, localBindings, routePath });
			if (slot !== null) {
				result.set(slot.key, { moduleSource: slot.moduleSource, parts: slot.parts });
			}
		}
	}

	return result;
}
