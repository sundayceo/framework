import { expect, test } from "vitest";

import { isInteractive } from "./interactivity-inference";

test("detects useState as interactive", () => {
	const source = `
		import { useState } from "react";
		export function Counter() {
			const [count, setCount] = useState(0);
			return <div>{count}</div>;
		}
	`;

	expect(isInteractive(source)).toBe(true);
});

test("detects useEffect as interactive", () => {
	const source = `
		import { useEffect } from "react";
		export function Logger() {
			useEffect(() => { console.log("mounted"); }, []);
			return <div>logged</div>;
		}
	`;

	expect(isInteractive(source)).toBe(true);
});

test("detects onClick in JSX as interactive", () => {
	const source = `
		export function Button() {
			return <button onClick={() => alert("hi")}>Click me</button>;
		}
	`;

	expect(isInteractive(source)).toBe(true);
});

test("detects onChange in JSX as interactive", () => {
	const source = `
		export function Input() {
			return <input onChange={(e) => console.log(e.target.value)} />;
		}
	`;

	expect(isInteractive(source)).toBe(true);
});

test("detects onSubmit in JSX as interactive", () => {
	const source = `
		export function Form() {
			return <form onSubmit={(e) => e.preventDefault()}><button type="submit">Go</button></form>;
		}
	`;

	expect(isInteractive(source)).toBe(true);
});

test("detects window.addEventListener as interactive", () => {
	const source = `
		export function Resizer() {
			window.addEventListener("resize", () => {});
			return <div>resizer</div>;
		}
	`;

	expect(isInteractive(source)).toBe(true);
});

test("detects document.querySelector as interactive", () => {
	const source = `
		export function Finder() {
			const el = document.querySelector(".foo");
			return <div>finder</div>;
		}
	`;

	expect(isInteractive(source)).toBe(true);
});

test("detects navigator usage as interactive", () => {
	const source = `
		export function Geo() {
			navigator.geolocation.getCurrentPosition(() => {});
			return <div>geo</div>;
		}
	`;

	expect(isInteractive(source)).toBe(true);
});

test("static component with no hooks or events is not interactive", () => {
	const source = `
		export function Heading({ title }: { title: string }) {
			return <h1>{title}</h1>;
		}
	`;

	expect(isInteractive(source)).toBe(false);
});

test("static component importing interactive child is interactive", () => {
	const source = `
		import { Counter } from "./counter";
		export function Page() {
			return <div><Counter /></div>;
		}
	`;

	const importGraph: Record<string, string> = {
		"./counter": `
			import { useState } from "react";
			export function Counter() {
				const [count, setCount] = useState(0);
				return <div>{count}</div>;
			}
		`,
	};

	expect(isInteractive(source, importGraph)).toBe(true);
});

test("static component importing only static children is not interactive", () => {
	const source = `
		import { Heading } from "./heading";
		import { Footer } from "./footer";
		export function Page() {
			return <div><Heading title="Hi" /><Footer /></div>;
		}
	`;

	const importGraph: Record<string, string> = {
		"./heading": `
			export function Heading({ title }: { title: string }) {
				return <h1>{title}</h1>;
			}
		`,
		"./footer": `
			export function Footer() {
				return <footer>Footer</footer>;
			}
		`,
	};

	expect(isInteractive(source, importGraph)).toBe(false);
});

test("transitive interactivity — deeply nested interactive dependency", () => {
	const source = `
		import { Layout } from "./layout";
		export function Page() {
			return <Layout />;
		}
	`;

	const importGraph: Record<string, string> = {
		"./layout": `
			import { Counter } from "./counter";
			export function Layout() {
				return <div><Counter /></div>;
			}
		`,
		"./counter": `
			import { useState } from "react";
			export function Counter() {
				const [count, setCount] = useState(0);
				return <div>{count}</div>;
			}
		`,
	};

	expect(isInteractive(source, importGraph)).toBe(true);
});
