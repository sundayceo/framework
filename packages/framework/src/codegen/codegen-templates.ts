export function generateTemplateRegistry(filePaths: string[]): string {
	const entries = filePaths
		.filter((f) => f.endsWith(".tsx"))
		.map((f) => f.replace(/\.tsx$/, ""))
		.sort();

	const lines = [
		'declare module "@sundayceo/framework" {',
		"\tinterface TemplateRegistry {",
		...entries.map((id) => `\t\t${id}: typeof import("./templates/${id}").default;`),
		"\t}",
		"}",
		"",
	];

	return lines.join("\n");
}
