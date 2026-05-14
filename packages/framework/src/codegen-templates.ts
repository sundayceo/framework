export function generateTemplateRegistry(filePaths: string[]): string {
	const entries = filePaths
		.filter((f) => f.endsWith(".tsx"))
		.map((f) => f.replace(/\.tsx$/, ""))
		.sort();

	const lines = [
		'declare module "@sundayceo/framework" {',
		"  interface TemplateRegistry {",
		...entries.map((id) => `    ${id}: typeof import("./templates/${id}").default;`),
		"  }",
		"}",
		"",
	];

	return lines.join("\n");
}
