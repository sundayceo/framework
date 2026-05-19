import React, { type ReactNode } from "react";
import { describe, expect, test } from "vitest";

import { extractSlots } from "./extract-slots";
import { Slot } from "./slot";

describe("extractSlots", () => {
	test("returns a single slot from a simple template", () => {
		function Template({ head }: { head: ReactNode }): ReactNode {
			return (
				<html>
					<head>{head}</head>
					<body>
						<Slot id="content" />
					</body>
				</html>
			);
		}

		const result = extractSlots(Template);

		expect(result.slots).toEqual(["content"]);
		expect(result.requiredSlots).toEqual(["content"]);
	});

	test("distinguishes required slots from optional slots with fallback", () => {
		function Template({ head }: { head: ReactNode }): ReactNode {
			return (
				<html>
					<head>{head}</head>
					<body>
						<Slot id="header" />
						<Slot id="sidebar" fallback={<nav>Default Nav</nav>} />
						<Slot id="content" />
						<Slot id="footer" fallback={<footer>Default Footer</footer>} />
					</body>
				</html>
			);
		}

		const result = extractSlots(Template);

		expect(result.slots).toEqual(["header", "sidebar", "content", "footer"]);
		expect(result.requiredSlots).toEqual(["header", "content"]);
	});

	test("finds deeply nested slots inside wrapper divs and fragments", () => {
		function Template({ head }: { head: ReactNode }): ReactNode {
			return (
				<html>
					<head>{head}</head>
					<body>
						<div className="layout">
							<header>
								<Slot id="header" />
							</header>
							<>
								<main>
									<div>
										<Slot id="content" />
									</div>
								</main>
								<footer>
									<Slot id="footer" />
								</footer>
							</>
						</div>
					</body>
				</html>
			);
		}

		const result = extractSlots(Template);

		expect(result.slots).toEqual(["header", "content", "footer"]);
		expect(result.requiredSlots).toEqual(["header", "content", "footer"]);
	});

	test("throws on duplicate slot IDs within a template", () => {
		function Template({ head }: { head: ReactNode }): ReactNode {
			return (
				<html>
					<head>{head}</head>
					<body>
						<Slot id="content" />
						<Slot id="content" />
					</body>
				</html>
			);
		}

		expect(() => extractSlots(Template)).toThrow('Duplicate slot ID: "content"');
	});
});
