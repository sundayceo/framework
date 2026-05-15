declare const handler: {
	fetch: (request: Request, platform?: unknown) => Promise<Response>;
};
export default handler;
