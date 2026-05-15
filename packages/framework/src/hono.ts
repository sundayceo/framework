type HonoLike = {
	all: (path: string, handler: (c: HonoContextLike) => Promise<Response>) => void;
};

type HonoContextLike = {
	req: { raw: Request };
};

function hono(app: HonoLike, handler: (request: Request) => Promise<Response>): void {
	app.all("*", (c) => handler(c.req.raw));
}

export { hono, type HonoLike };
