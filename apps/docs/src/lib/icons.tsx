import {
	BookOpen,
	BracketsCurly,
	Code,
	Compass,
	Download,
	Lightning,
	ListChecks,
	Question,
	Rocket,
} from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";

const iconMap: Record<string, ReactNode> = {
	rocket: <Rocket />,
	download: <Download />,
	lightning: <Lightning />,
	compass: <Compass />,
	book: <BookOpen />,
	code: <Code />,
	brackets: <BracketsCurly />,
	question: <Question />,
	checklist: <ListChecks />,
};

export function resolveIcon(icon: string | undefined): ReactNode | undefined {
	if (!icon) return undefined;
	return iconMap[icon];
}
