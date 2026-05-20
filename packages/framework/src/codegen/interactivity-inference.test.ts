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

test("detects useLayoutEffect as interactive", () => {
	const source = `
		import { useLayoutEffect } from "react";
		export function Measurer() {
			useLayoutEffect(() => { /* measure DOM */ }, []);
			return <div>measured</div>;
		}
	`;

	expect(isInteractive(source)).toBe(true);
});

test("detects useContext as interactive", () => {
	const source = `
		import { useContext } from "react";
		export function Themed() {
			const theme = useContext(ThemeCtx);
			return <div>{theme.color}</div>;
		}
	`;

	expect(isInteractive(source)).toBe(true);
});

test("detects useId as interactive", () => {
	const source = `
		import { useId } from "react";
		export function LabeledInput() {
			const id = useId();
			return <label htmlFor={id}><input id={id} /></label>;
		}
	`;

	expect(isInteractive(source)).toBe(true);
});

test("detects useSyncExternalStore as interactive", () => {
	const source = `
		import { useSyncExternalStore } from "react";
		export function Clock() {
			const time = useSyncExternalStore(subscribe, getSnapshot);
			return <div>{time}</div>;
		}
	`;

	expect(isInteractive(source)).toBe(true);
});

test("detects useTransition as interactive", () => {
	const source = `
		import { useTransition } from "react";
		export function NavLink() {
			const [isPending, startTransition] = useTransition();
			return <button>{isPending ? "Loading..." : "Go"}</button>;
		}
	`;

	expect(isInteractive(source)).toBe(true);
});

test("does not flag non-hook function names containing hook substring", () => {
	const source = `
		export function useStateManager() {
			return {};
		}
	`;

	expect(isInteractive(source)).toBe(false);
});

test("detects useActionState as interactive", () => {
	const source = `
		import { useActionState } from "react";
		export function Form() {
			const [state, action] = useActionState(fn, initialState);
			return <form action={action}>{state}</form>;
		}
	`;

	expect(isInteractive(source)).toBe(true);
});

test("detects useOptimistic as interactive", () => {
	const source = `
		import { useOptimistic } from "react";
		export function LikeButton() {
			const [optimisticLikes, addOptimisticLike] = useOptimistic(likes);
			return <button>{optimisticLikes}</button>;
		}
	`;

	expect(isInteractive(source)).toBe(true);
});

test("detects useFormStatus as interactive", () => {
	const source = `
		import { useFormStatus } from "react-dom";
		export function SubmitButton() {
			const { pending } = useFormStatus();
			return <button disabled={pending}>Submit</button>;
		}
	`;

	expect(isInteractive(source)).toBe(true);
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
