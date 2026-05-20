import { parse } from "@babel/parser";

/** Extracts non-type import source specifiers using Babel AST parsing. */
export function parseImportSpecifiers(source: string): string[] {
	const ast = parse(source, {
		sourceType: "module",
		plugins: ["typescript", "jsx"],
	});

	const specifiers: string[] = [];
	for (const node of ast.program.body) {
		if (node.type === "ImportDeclaration" && node.importKind !== "type") {
			specifiers.push(node.source.value);
		}
	}
	return specifiers;
}
