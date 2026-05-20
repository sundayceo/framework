import React from "react";

import { definePage } from "@sundayceo/framework";

const features = [
	{
		title: "Interactive Counter",
		href: "/counter",
		description: "Selective hydration — only the counter ships JavaScript.",
	},
	{
		title: "Blog with Dynamic Routes",
		href: "/blog/hello-world",
		description: "File-based routing with [slug] params and static priority.",
	},
	{
		title: "Catch-All Docs",
		href: "/docs/getting-started/install",
		description: "Catch-all routes with [...slug] for nested paths.",
	},
	{
		title: "Full Hydration",
		href: "/full-hydration",
		description: "Every slot in the template ships client-side JavaScript.",
	},
	{
		title: "Async Data Loading",
		href: "/async-data",
		description: "Loaders can be async — data is awaited before rendering.",
	},
	{
		title: "App Context",
		href: "/app-context",
		description: "Global context injected into every loader via createApp.",
	},
	{
		title: "Request Data",
		href: "/request-data?name=sundayceo",
		description: "Loaders receive the full Request for query params and headers.",
	},
	{
		title: "Meta Tags",
		href: "/meta-static",
		description: "Declarative meta — static or computed from loader data.",
	},
	{
		title: "Route Groups",
		href: "/pricing",
		description: "Parenthesized directories like (marketing)/ are stripped from URLs.",
	},
	{
		title: "Nested Params",
		href: "/users/42/posts/7",
		description: "Deeply nested dynamic segments: /users/:id/posts/:postId.",
	},
	{
		title: "API Health",
		href: "/api/health",
		description: "API handlers return raw Response objects — no templates.",
	},
];

export default definePage("/")({
	template: "default" as const,
	meta: {
		title: "sundayceo framework",
		description: "A server-first React framework with selective hydration.",
	},
	defineSlots: () => ({
		header: (
			<div className="flex items-center justify-between">
				<h1 className="text-xl font-semibold tracking-tight">sundayceo</h1>
				<span className="text-sm text-gray-400">framework playground</span>
			</div>
		),
		main: (
			<div className="space-y-12">
				<section className="space-y-3">
					<h2 className="text-3xl font-bold tracking-tight">
						Server-first React,
						<br />
						<span className="text-gray-400">client-optional.</span>
					</h2>
					<p className="max-w-xl text-lg text-gray-600">
						Zero JavaScript by default. Interactive components hydrate only where needed. File-based
						routing, loaders, templates, and error pages — all server-rendered.
					</p>
				</section>

				<section className="space-y-4">
					<h3 className="text-sm font-medium uppercase tracking-wider text-gray-400">Features</h3>
					<div className="grid gap-4 sm:grid-cols-2">
						{features.map((f) => (
							<a
								key={f.href}
								href={f.href}
								className="group rounded-lg border border-gray-200 p-4 transition-colors hover:border-gray-400 hover:bg-gray-50"
							>
								<h4 className="font-medium group-hover:text-black">{f.title}</h4>
								<p className="mt-1 text-sm text-gray-500">{f.description}</p>
							</a>
						))}
					</div>
				</section>
			</div>
		),
		footer: (
			<p>
				Built with <span className="font-medium">@sundayceo/framework</span>
			</p>
		),
	}),
});
