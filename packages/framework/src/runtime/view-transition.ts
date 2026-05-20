/** Returns a style prop object that assigns a view-transition-name for CSS View Transitions. */
export function viewTransitionName(name: string): { style: { viewTransitionName: string } } {
	return { style: { viewTransitionName: name } };
}
