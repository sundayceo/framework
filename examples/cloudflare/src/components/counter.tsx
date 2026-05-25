import React, { useState } from "react";

export function Counter({ label }: { label: string }): React.ReactNode {
	const [count, setCount] = useState(0);

	return (
		<div className="space-y-2">
			<p className="text-sm text-gray-600">{label}</p>
			<button
				className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
				onClick={(): void => {
					setCount((prev) => prev + 1);
				}}
			>
				Count: {count}
			</button>
		</div>
	);
}
