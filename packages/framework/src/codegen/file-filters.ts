export const ROUTE_EXTENSIONS = [".tsx", ".ts"];
export const TEST_PATTERN = /\.test\.[^.]+$/;
export const ERROR_PAGE_PATTERN = /^(?:.*\/)?([45]\d{2})\.[^.]+$/;

/** Returns true if the file path has a .tsx or .ts extension. */
export const hasRouteExtension = (fp: string): boolean =>
	ROUTE_EXTENSIONS.some((ext) => fp.endsWith(ext));

/** Returns true if the file path matches the test file naming convention. */
export const isTestFile = (fp: string): boolean => TEST_PATTERN.test(fp);

/** Returns true if the file has a route extension and is not a test file. */
export const isRouteFile = (fp: string): boolean => hasRouteExtension(fp) && !isTestFile(fp);
