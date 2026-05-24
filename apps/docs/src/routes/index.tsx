import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: HomePage,
});

function HomePage() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
			<img src="/sundayceo-dark.svg" alt="sundayceo" className="h-8 dark:hidden" />
			<img src="/sundayceo-light.svg" alt="sundayceo" className="hidden h-8 dark:block" />
			<h1 className="text-4xl font-bold tracking-tight sm:text-5xl">framework</h1>
			<p className="max-w-xl text-lg text-fd-muted-foreground">
				A lightweight, React-based TypeScript framework for Cloudflare Workers. Designed to be
				minimal, token-efficient, and built around a template-and-slots model where pages declare
				which components fill which template regions.
			</p>
			<div className="flex gap-4">
				<a
					href="/docs"
					className="rounded-lg bg-fd-primary px-6 py-3 text-sm font-medium text-fd-primary-foreground transition-colors hover:bg-fd-primary/90"
				>
					Get Started
				</a>
				<a
					href="https://github.com/sundayceo/framework"
					className="rounded-lg border border-fd-border px-6 py-3 text-sm font-medium transition-colors hover:bg-fd-accent"
				>
					GitHub
				</a>
				<a
					href="https://www.npmjs.com/package/@sundayceo/framework"
					className="rounded-lg border border-fd-border px-6 py-3 text-sm font-medium transition-colors hover:bg-fd-accent"
				>
					<img src="/npm.svg" alt="npm" className="inline h-4" />
				</a>
			</div>
		</main>
	);
}
