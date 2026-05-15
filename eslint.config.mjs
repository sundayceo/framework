import { resolve } from "node:path";

import js from "@eslint/js";
import boundaries from "eslint-plugin-boundaries";
import checkFile from "eslint-plugin-check-file";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

import { layerEnforcementConfigs } from "./tools/eslint-config/layers.mjs";

const noCommentsRule = {
	meta: {
		type: "suggestion",
		docs: { description: "Disallow comments except type directives" },
		messages: { noComments: "Comments are not allowed. Code should be self-documenting." },
		schema: [],
	},
	create(context) {
		const source = context.sourceCode;
		return {
			Program() {
				for (const comment of source.getAllComments()) {
					const text = comment.value.trim();
					if (
						text.startsWith("@ts-") ||
						text.startsWith("eslint-disable") ||
						text.startsWith("eslint-enable") ||
						text.startsWith("@type") ||
						text.startsWith("@param") ||
						text.startsWith("@returns") ||
						text.startsWith("@deprecated")
					) {
						continue;
					}
					context.report({ node: null, loc: comment.loc, messageId: "noComments" });
				}
			},
		};
	},
};

const noBracketAccessRule = {
	meta: {
		type: "suggestion",
		docs: { description: "Prefer .at() over bracket notation for array access" },
		messages: {
			preferAt:
				"Use .at({{index}}) instead of bracket notation for array access. Bracket notation is only allowed for known-index object access.",
		},
		schema: [],
	},
	create(context) {
		return {
			MemberExpression(node) {
				if (!node.computed) {
					return;
				}
				if (node.property.type !== "Literal" && node.property.type !== "UnaryExpression") {
					return;
				}
				if (node.property.type === "Literal" && typeof node.property.value !== "number") {
					return;
				}
				const parent = node.parent;
				if (parent.type === "AssignmentExpression" && parent.left === node) {
					return;
				}
				const index =
					node.property.type === "UnaryExpression"
						? context.sourceCode.getText(node.property)
						: String(node.property.value);
				context.report({ node, messageId: "preferAt", data: { index } });
			},
		};
	},
};

const noConditionalSpreadRule = {
	meta: {
		type: "suggestion",
		docs: { description: "Disallow conditional spread patterns" },
		messages: {
			noConditionalSpread:
				"Do not use conditional spread (...(condition && obj)). Use explicit conditionals instead.",
		},
		schema: [],
	},
	create(context) {
		return {
			SpreadElement(node) {
				if (
					node.argument.type === "LogicalExpression" &&
					(node.argument.operator === "&&" || node.argument.operator === "||")
				) {
					context.report({ node, messageId: "noConditionalSpread" });
				}
				if (
					node.argument.type === "ConditionalExpression" ||
					(node.argument.type === "SequenceExpression" &&
						node.argument.expressions.some((e) => e.type === "ConditionalExpression"))
				) {
					context.report({ node, messageId: "noConditionalSpread" });
				}
			},
		};
	},
};

const noNestedDestructuringRule = {
	meta: {
		type: "suggestion",
		docs: { description: "Disallow nested destructuring patterns" },
		messages: {
			noNestedDestructuring: "No nested destructuring. Destructure in separate statements.",
		},
		schema: [],
	},
	create(context) {
		const checkPattern = (pattern, depth) => {
			if (depth > 1) {
				context.report({ node: pattern, messageId: "noNestedDestructuring" });
				return;
			}
			if (pattern.type === "ObjectPattern") {
				for (const prop of pattern.properties) {
					if (prop.type === "Property" && prop.value) {
						checkPattern(prop.value, depth + 1);
					}
				}
			}
			if (pattern.type === "ArrayPattern") {
				for (const element of pattern.elements) {
					if (element) {
						checkPattern(element, depth + 1);
					}
				}
			}
		};
		return {
			VariableDeclarator(node) {
				if (node.id.type === "ObjectPattern" || node.id.type === "ArrayPattern") {
					checkPattern(node.id, 0);
				}
			},
		};
	},
};

const booleanNamingRule = {
	meta: {
		type: "suggestion",
		docs: { description: "Require boolean variables to use is/has/can/should/will/did prefix" },
		messages: {
			booleanNaming:
				"Boolean variable '{{name}}' must start with is, has, can, should, will, or did.",
		},
		schema: [],
	},
	create(context) {
		const PREFIXES = ["is", "has", "can", "should", "will", "did"];
		const startsWithPrefix = (name) =>
			PREFIXES.some((p) => name.startsWith(p) && name[p.length] === name[p.length]?.toUpperCase());

		const checkBooleanNaming = (node, name) => {
			if (!name || name.startsWith("_")) {
				return;
			}
			if (startsWithPrefix(name)) {
				return;
			}
			context.report({ node, messageId: "booleanNaming", data: { name } });
		};

		return {
			VariableDeclarator(node) {
				if (node.id.type !== "Identifier") {
					return;
				}
				if (node.id.typeAnnotation?.typeAnnotation?.type === "TSBooleanKeyword") {
					checkBooleanNaming(node.id, node.id.name);
				}
				if (node.init?.type === "Literal" && typeof node.init.value === "boolean") {
					checkBooleanNaming(node.id, node.id.name);
				}
			},
			TSPropertySignature(node) {
				if (
					node.key.type === "Identifier" &&
					node.typeAnnotation?.typeAnnotation?.type === "TSBooleanKeyword"
				) {
					checkBooleanNaming(node.key, node.key.name);
				}
			},
			PropertyDefinition(node) {
				if (
					node.key.type === "Identifier" &&
					node.typeAnnotation?.typeAnnotation?.type === "TSBooleanKeyword"
				) {
					checkBooleanNaming(node.key, node.key.name);
				}
			},
		};
	},
};

const noIndexFileRule = {
	meta: {
		type: "suggestion",
		docs: { description: "Disallow index.ts barrel files" },
		messages: {
			noIndexFile:
				"index.ts barrel files are not allowed. Use explicit named exports via subpath exports.",
		},
		schema: [],
	},
	create(context) {
		const filename = context.filename;
		if (/[/\\]index\.(ts|tsx|js|mjs)$/.test(filename)) {
			return {
				Program(node) {
					const hasExportFrom = node.body.some(
						(stmt) => stmt.type === "ExportNamedDeclaration" && stmt.source !== null,
					);
					const hasExportAll = node.body.some((stmt) => stmt.type === "ExportAllDeclaration");
					if (hasExportFrom || hasExportAll) {
						context.report({ node, messageId: "noIndexFile" });
					}
				},
			};
		}
		return {};
	},
};

export default defineConfig(
	{
		ignores: [
			"**/node_modules/**",
			"**/dist/**",
			"**/.wrangler/**",
			"**/.turbo/**",
			"**/framework.gen.d.ts",
			"**/routes.gen.ts",
			"**/vite.config.ts",
			"**/vitest.config.ts",
			"**/vitest.setup.ts",
			"**/tsup.config.ts",
			"tools/**",
			"templates/**",
			"**/scripts/**",
		],
	},

	js.configs.recommended,

	tseslint.configs.strictTypeChecked,
	tseslint.configs.stylisticTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
			},
		},
	},

	{
		languageOptions: {
			globals: {
				...globals.node,
				...globals.browser,
			},
		},
	},

	{
		files: ["**/*.ts", "**/*.tsx"],
		plugins: {
			"check-file": checkFile,
			custom: {
				rules: {
					"no-comments": noCommentsRule,
					"no-bracket-access": noBracketAccessRule,
					"no-conditional-spread": noConditionalSpreadRule,
					"no-nested-destructuring": noNestedDestructuringRule,
					"boolean-naming": booleanNamingRule,
					"no-index-file": noIndexFileRule,
				},
			},
		},
		rules: {
			"custom/no-comments": "error",
			"custom/no-bracket-access": "error",
			"custom/no-conditional-spread": "error",
			"custom/no-nested-destructuring": "error",
			"custom/boolean-naming": "error",

			"@typescript-eslint/consistent-type-imports": [
				"error",
				{ prefer: "type-imports", fixStyle: "inline-type-imports" },
			],
			"@typescript-eslint/no-import-type-side-effects": "error",
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group: ["**/internal/*", "**/internal"],
							message: "Do not import from internal/ — it is not part of the public API.",
						},
					],
				},
			],

			"no-restricted-exports": ["error", { restrictDefaultExports: { direct: true } }],

			"@typescript-eslint/consistent-type-definitions": ["error", "type"],

			"no-restricted-syntax": [
				"error",
				{
					selector: "TSEnumDeclaration",
					message: "Enums are not allowed. Use `as const` objects instead.",
				},
				{
					selector: "ForInStatement",
					message: "Use Object.keys/Object.entries with for...of instead.",
				},
				{
					selector: "LabeledStatement",
					message: "Labels are not allowed.",
				},
				{
					selector: "ContinueStatement",
					message: "Continue statements are not allowed. Restructure your loop logic.",
				},
				{
					selector: "WithStatement",
					message: "With statements are not allowed.",
				},
			],

			"@typescript-eslint/naming-convention": [
				"error",
				{
					selector: "typeAlias",
					format: ["PascalCase"],
				},
				{
					selector: "variable",
					format: ["camelCase", "UPPER_CASE", "PascalCase"],
					leadingUnderscore: "allow",
				},
				{
					selector: "function",
					format: ["camelCase", "PascalCase"],
				},
				{
					selector: "parameter",
					format: ["camelCase"],
					leadingUnderscore: "allow",
				},
				{
					selector: "method",
					format: ["camelCase"],
				},
				{
					selector: "property",
					format: ["camelCase", "UPPER_CASE", "PascalCase"],
					leadingUnderscore: "allow",
					filter: { regex: "^(content-type|x-|Content-|Authorization).*", match: false },
				},
				{
					selector: "objectLiteralProperty",
					format: null,
				},
			],

			"check-file/filename-naming-convention": [
				"error",
				{ "**/*.{ts,tsx}": "KEBAB_CASE" },
				{ ignoreMiddleExtensions: true },
			],

			"check-file/folder-naming-convention": [
				"error",
				{
					"packages/**": "KEBAB_CASE",
					"apps/**": "KEBAB_CASE",
				},
			],

			"prefer-arrow-callback": "error",
			"@typescript-eslint/method-signature-style": ["error", "property"],

			"@typescript-eslint/explicit-function-return-type": [
				"error",
				{
					allowExpressions: true,
					allowTypedFunctionExpressions: true,
					allowHigherOrderFunctions: true,
					allowDirectConstAssertionInArrowFunctions: true,
					allowConciseArrowFunctionExpressionsStartingWithVoid: false,
				},
			],

			"@typescript-eslint/no-explicit-any": "error",
			"@typescript-eslint/no-non-null-assertion": "error",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
			],
			"@typescript-eslint/prefer-nullish-coalescing": "error",
			"@typescript-eslint/prefer-optional-chain": "error",
			"@typescript-eslint/strict-boolean-expressions": [
				"error",
				{
					allowString: false,
					allowNumber: false,
					allowNullableObject: true,
					allowNullableBoolean: true,
					allowNullableString: false,
					allowNullableNumber: false,
					allowAny: false,
				},
			],
			"@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
			"@typescript-eslint/switch-exhaustiveness-check": "error",
			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/await-thenable": "error",
			"@typescript-eslint/require-await": "error",
			"@typescript-eslint/no-unnecessary-condition": "error",
			"@typescript-eslint/no-unsafe-argument": "error",
			"@typescript-eslint/no-unsafe-assignment": "error",
			"@typescript-eslint/no-unsafe-call": "error",
			"@typescript-eslint/no-unsafe-member-access": "error",
			"@typescript-eslint/no-unsafe-return": "error",
			"@typescript-eslint/no-redundant-type-constituents": "error",
			"@typescript-eslint/no-duplicate-type-constituents": "error",
			"@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
			"@typescript-eslint/use-unknown-in-catch-callback-variable": "error",

			"@typescript-eslint/prefer-readonly": "error",
			"@typescript-eslint/explicit-member-accessibility": ["error", { accessibility: "explicit" }],
			"@typescript-eslint/no-this-alias": "error",
			"@typescript-eslint/class-methods-use-this": "error",

			"no-await-in-loop": "error",

			eqeqeq: ["error", "always"],
			"no-console": "error",
			"no-debugger": "error",
			"no-eval": "error",
			"no-implied-eval": "error",
			"prefer-const": "error",
			"no-var": "error",
			"object-shorthand": "error",
			"prefer-template": "error",
			curly: ["error", "all"],
			"no-param-reassign": ["error", { props: true }],
			"no-delete-var": "error",
			"prefer-destructuring": [
				"error",
				{
					VariableDeclarator: { array: false, object: true },
					AssignmentExpression: { array: false, object: false },
				},
			],
			"no-nested-ternary": "error",
			"no-unneeded-ternary": "error",
			"no-else-return": ["error", { allowElseIf: false }],
			"no-lonely-if": "error",
			"prefer-includes": "off",
			"@typescript-eslint/prefer-includes": "error",
			"@typescript-eslint/prefer-string-starts-ends-with": "error",
			"no-useless-template-literal": "off",

			complexity: ["error", { max: 10 }],
			"max-depth": ["error", { max: 3 }],
			"max-lines": ["error", { max: 250, skipBlankLines: true, skipComments: true }],
			"max-lines-per-function": ["error", { max: 50, skipBlankLines: true, skipComments: true }],
			"max-params": ["error", { max: 3 }],

			"prefer-object-spread": "error",
			"no-bitwise": "error",
			"logical-assignment-operators": ["error", "always"],

			"consistent-return": "error",
			"@typescript-eslint/no-useless-empty-export": "error",
			"@typescript-eslint/return-await": ["error", "in-try-catch"],
			"@typescript-eslint/prefer-for-of": "error",
			"@typescript-eslint/prefer-function-type": "error",

			"@typescript-eslint/no-magic-numbers": [
				"error",
				{
					ignore: [-1, 0, 1, 2],
					ignoreArrayIndexes: true,
					ignoreDefaultValues: true,
					ignoreEnums: true,
					ignoreNumericLiteralTypes: true,
					ignoreReadonlyClassProperties: true,
					ignoreTypeIndexes: true,
				},
			],

			"@typescript-eslint/no-dynamic-delete": "error",
			"@typescript-eslint/no-misused-promises": [
				"error",
				{ checksVoidReturn: { arguments: true } },
			],

			"prefer-regex-literals": "error",
			"@typescript-eslint/prefer-regexp-exec": "error",
		},
	},

	{
		files: ["packages/*/src/**/*.ts", "packages/*/src/**/*.tsx"],
		plugins: {
			boundaries,
		},
		settings: {
			"boundaries/root-path": resolve(import.meta.dirname),
			"boundaries/elements": [
				{
					type: "shared",
					pattern: "packages/*/src/shared/**",
					capture: ["package"],
				},
				{
					type: "server",
					pattern: "packages/*/src/server/**",
					capture: ["package"],
				},
				{
					type: "client",
					pattern: "packages/*/src/client/**",
					capture: ["package"],
				},
				{
					type: "vite-plugin",
					pattern: "packages/*/src/vite-plugin/**",
					capture: ["package"],
				},
			],
		},
		rules: {
			"boundaries/element-types": [
				"error",
				{
					default: "allow",
					rules: [
						{
							from: ["shared"],
							disallow: ["server", "client", "vite-plugin"],
							message: "shared/ cannot import from server/, client/, or vite-plugin/.",
						},
					],
				},
			],
		},
	},

	...layerEnforcementConfigs(),

	{
		files: ["**/*.test.ts", "**/*.test.tsx", "**/*.integration.test.ts"],
		rules: {
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-non-null-assertion": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/no-floating-promises": "off",
			"@typescript-eslint/no-magic-numbers": "off",
			"@typescript-eslint/consistent-type-assertions": "off",
			"no-restricted-syntax": "off",
			"no-restricted-imports": "off",
			"max-lines-per-function": "off",
			"max-lines": "off",
			"custom/no-comments": "off",
		},
	},

	{
		files: ["**/templates/**/*.tsx", "**/server.ts"],
		rules: {
			"no-restricted-exports": "off",
		},
	},

	{
		files: [
			"**/routes/404.tsx",
			"**/routes/404.test.tsx",
			"**/routes/500.tsx",
			"**/routes/500.test.tsx",
		],
		rules: {
			"check-file/filename-naming-convention": "off",
		},
	},

	{
		files: ["**/routes/**/*.ts", "**/routes/**/*.tsx"],
		rules: {
			"@typescript-eslint/naming-convention": [
				"error",
				{
					selector: "typeAlias",
					format: ["PascalCase"],
				},
				{
					selector: "variable",
					format: ["camelCase", "UPPER_CASE", "PascalCase"],
					leadingUnderscore: "allow",
				},
				{
					selector: "function",
					format: ["camelCase", "PascalCase"],
				},
				{
					selector: "parameter",
					format: ["camelCase"],
					leadingUnderscore: "allow",
				},
				{
					selector: "method",
					format: ["camelCase", "UPPER_CASE"],
				},
				{
					selector: "property",
					format: ["camelCase", "UPPER_CASE", "PascalCase"],
					leadingUnderscore: "allow",
					filter: { regex: "^(content-type|x-|Content-|Authorization).*", match: false },
				},
				{
					selector: "objectLiteralProperty",
					format: null,
				},
			],
		},
	},

	{
		files: ["**/*.mjs", "**/*.js", "**/*.cjs"],
		extends: [tseslint.configs.disableTypeChecked],
		rules: {
			"no-console": "off",
		},
	},
);
