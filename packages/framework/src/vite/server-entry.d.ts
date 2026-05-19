/** The server entry handler that processes incoming requests and returns responses. */
declare const handler: {
	fetch: (request: Request, platform?: unknown) => Promise<Response>;
};
// eslint-disable-next-line no-restricted-exports
export default handler;
