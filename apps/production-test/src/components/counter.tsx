import React, { useState } from "react";

export function Counter({ label }: { label: string }): React.ReactNode {
	const [count, setCount] = useState(0);

	return (
		<div>
			<p>{label}</p>
			<button
				onClick={(): void => {
					setCount((prev) => prev + 1);
				}}
			>
				Count: {count}
			</button>
		</div>
	);
}
