import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
	return {
		nav: {
			title: (
				<>
					<img
						src="/sundayceo-framework-dark.svg"
						alt="sundayceo framework"
						className="h-7 dark:hidden"
					/>
					<img
						src="/sundayceo-framework-light.svg"
						alt="sundayceo framework"
						className="hidden h-7 dark:block"
					/>
				</>
			),
		},
		links: [
			{
				type: "icon",
				label: "Sunday CEO",
				text: "Sunday CEO",
				url: "https://sundayceo.com",
				icon: (
					<>
						<img src="/sundayceo-dark.svg" alt="sundayceo" className="h-5 dark:hidden" />
						<img src="/sundayceo-light.svg" alt="sundayceo" className="hidden h-5 dark:block" />
					</>
				),
				external: true,
			},
			{
				type: "icon",
				label: "GitHub",
				text: "GitHub",
				url: "https://github.com/sundayceo/framework",
				icon: (
					<>
						<img src="/github-light.svg" alt="GitHub" className="h-5 dark:hidden" />
						<img src="/github-dark.svg" alt="GitHub" className="hidden h-5 dark:block" />
					</>
				),
				external: true,
			},
			{
				type: "icon",
				label: "npm",
				text: "npm",
				url: "https://www.npmjs.com/package/@sundayceo/framework",
				icon: <img src="/npm.svg" alt="npm" className="h-5" />,
				external: true,
			},
		],
	};
}
