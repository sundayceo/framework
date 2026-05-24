import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import * as React from "react";

import "@/global.css";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "sundayceo framework" },
			{
				name: "description",
				content:
					"A lightweight, React-based TypeScript framework for Cloudflare Workers with selective hydration.",
			},
			{ property: "og:title", content: "sundayceo framework" },
			{
				property: "og:description",
				content:
					"A lightweight, React-based TypeScript framework for Cloudflare Workers with selective hydration.",
			},
			{ property: "og:type", content: "website" },
			{ property: "og:url", content: "https://framework.sundayceo.com" },
		],
		links: [
			{ rel: "icon", href: "/favicon.ico" },
			{ rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
			{ rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
			{ rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
			{ rel: "manifest", href: "/site.webmanifest" },
		],
	}),
	component: RootComponent,
});

function RootComponent() {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body className="flex min-h-screen flex-col">
				<RootProvider>
					<Outlet />
				</RootProvider>
				<Scripts />
			</body>
		</html>
	);
}
