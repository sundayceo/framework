import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export const baseOptions: BaseLayoutProps = {
	nav: {
		title: (
			<>
				<svg
					width="20"
					height="20"
					viewBox="0 0 40 43"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M20.4808 3L27.9431 4.48435L24.6189 16.3069L34.2694 8.71142L38.4964 15.0377L27.786 21.0469L39.9808 22.5L38.4964 29.9623L26.6738 26.6381L34.2694 36.2886L20.4808 42L19.0277 29.8052L13.0185 40.5156L6.6922 36.2886L14.2877 26.6381L2.46513 29.9623L0.980785 22.5L13.1756 21.0469L2.46513 15.0377L13.0185 4.48435L19.0277 15.1948L20.4808 3Z"
						fill="currentColor"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinejoin="bevel"
					/>
				</svg>
				<span className="font-semibold">framework</span>
			</>
		),
	},
	links: [
		{
			text: "Sunday CEO",
			url: "https://sundayceo.com",
			external: true,
		},
		{
			text: "GitHub",
			url: "https://github.com/sundayceo/framework",
			external: true,
		},
	],
};
