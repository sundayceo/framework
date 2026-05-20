import { expect, test } from "vitest";

import { isInteractive } from "./interactivity-inference";

test.each([
	[
		"useState",
		`import { useState } from "react";
		export function Counter() {
			const [count, setCount] = useState(0);
			return <div>{count}</div>;
		}`,
	],
	[
		"useEffect",
		`import { useEffect } from "react";
		export function Logger() {
			useEffect(() => { console.log("mounted"); }, []);
			return <div>logged</div>;
		}`,
	],
	[
		"useLayoutEffect",
		`import { useLayoutEffect } from "react";
		export function Measurer() {
			useLayoutEffect(() => { /* measure DOM */ }, []);
			return <div>measured</div>;
		}`,
	],
	[
		"useContext",
		`import { useContext } from "react";
		export function Themed() {
			const theme = useContext(ThemeCtx);
			return <div>{theme.color}</div>;
		}`,
	],
	[
		"useId",
		`import { useId } from "react";
		export function LabeledInput() {
			const id = useId();
			return <label htmlFor={id}><input id={id} /></label>;
		}`,
	],
	[
		"useSyncExternalStore",
		`import { useSyncExternalStore } from "react";
		export function Clock() {
			const time = useSyncExternalStore(subscribe, getSnapshot);
			return <div>{time}</div>;
		}`,
	],
	[
		"useTransition",
		`import { useTransition } from "react";
		export function NavLink() {
			const [isPending, startTransition] = useTransition();
			return <button>{isPending ? "Loading..." : "Go"}</button>;
		}`,
	],
	[
		"useActionState",
		`import { useActionState } from "react";
		export function Form() {
			const [state, action] = useActionState(fn, initialState);
			return <form action={action}>{state}</form>;
		}`,
	],
	[
		"useOptimistic",
		`import { useOptimistic } from "react";
		export function LikeButton() {
			const [optimisticLikes, addOptimisticLike] = useOptimistic(likes);
			return <button>{optimisticLikes}</button>;
		}`,
	],
	[
		"useFormStatus",
		`import { useFormStatus } from "react-dom";
		export function SubmitButton() {
			const { pending } = useFormStatus();
			return <button disabled={pending}>Submit</button>;
		}`,
	],
])("detects React hooks as interactive — %s", (_hook, source) => {
	expect(isInteractive(source)).toBe(true);
});

test.each([
	[
		"onClick",
		`export function Button() {
			return <button onClick={() => alert("hi")}>Click me</button>;
		}`,
	],
	[
		"onChange",
		`export function Input() {
			return <input onChange={(e) => console.log(e.target.value)} />;
		}`,
	],
	[
		"onSubmit",
		`export function Form() {
			return <form onSubmit={(e) => e.preventDefault()}><button type="submit">Go</button></form>;
		}`,
	],
])("detects JSX event handlers as interactive — %s", (_handler, source) => {
	expect(isInteractive(source)).toBe(true);
});

test.each([
	[
		"window.addEventListener",
		`export function Resizer() {
			window.addEventListener("resize", () => {});
			return <div>resizer</div>;
		}`,
	],
	[
		"document.querySelector",
		`export function Finder() {
			const el = document.querySelector(".foo");
			return <div>finder</div>;
		}`,
	],
	[
		"navigator",
		`export function Geo() {
			navigator.geolocation.getCurrentPosition(() => {});
			return <div>geo</div>;
		}`,
	],
])("detects browser API usage as interactive — %s", (_api, source) => {
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

test("does not flag non-hook function names containing hook substring", () => {
	const source = `
		export function useStateManager() {
			return {};
		}
	`;

	expect(isInteractive(source)).toBe(false);
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

test("circular import graph does not cause infinite loop", () => {
	const source = `
		import { A } from "./a";
		export function Page() { return <A />; }
	`;

	const importGraph: Record<string, string> = {
		"./a": `import { B } from "./b";\nexport function A() { return <B />; }`,
		"./b": `import { A } from "./a";\nexport function B() { return <A />; }`,
	};

	expect(isInteractive(source, importGraph)).toBe(false);
});

test("type-only import does not trigger transitive interactivity check", () => {
	const source = `
		import type { Props } from "./types";
		export function Static({ title }: Props) {
			return <h1>{title}</h1>;
		}
	`;

	const importGraph: Record<string, string> = {
		"./types": `
			import { useState } from "react";
			export type Props = { title: string };
			export function Counter() {
				const [count, setCount] = useState(0);
				return <div>{count}</div>;
			}
		`,
	};

	expect(isInteractive(source, importGraph)).toBe(false);
});
