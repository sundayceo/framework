import Link from "next/link";

export default function HomePage() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img src="/logo.svg" alt="sundayceo" className="h-8 dark:invert" />
			<h1 className="text-4xl font-bold tracking-tight sm:text-5xl">framework</h1>
			<p className="max-w-xl text-lg text-fd-muted-foreground">
				Server-first React with selective hydration. Zero JavaScript by default — interactive
				components hydrate only where needed.
			</p>
			<div className="flex gap-4">
				<Link
					href="/docs"
					className="rounded-lg bg-fd-primary px-6 py-3 text-sm font-medium text-fd-primary-foreground transition-colors hover:bg-fd-primary/90"
				>
					Get Started
				</Link>
				<Link
					href="https://github.com/sundayceo/framework"
					className="rounded-lg border border-fd-border px-6 py-3 text-sm font-medium transition-colors hover:bg-fd-accent"
				>
					GitHub
				</Link>
			</div>
		</main>
	);
}
