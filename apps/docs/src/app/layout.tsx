import "./global.css";

import { RootProvider } from "fumadocs-ui/provider";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
	title: {
		template: "%s | sundayceo framework",
		default: "sundayceo framework",
	},
	description: "Server-first React framework with selective hydration.",
	metadataBase: new URL("https://framework.sundayceo.com"),
	openGraph: {
		title: "sundayceo framework",
		description: "Server-first React framework with selective hydration.",
		url: "https://framework.sundayceo.com",
		siteName: "sundayceo framework",
		type: "website",
	},
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body>
				<RootProvider>{children}</RootProvider>
			</body>
		</html>
	);
}
