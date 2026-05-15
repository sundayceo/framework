import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";

import { describe, expect, test } from "vitest";

import { toWebRequest, writeResponse } from "./vite-dev-middleware";

const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function createMockRequest(options: {
	method?: string;
	url?: string;
	headers?: Record<string, string>;
	body?: string;
}): IncomingMessage {
	const { method = "GET", url = "/", headers = {}, body } = options;
	const socket = new Socket();
	const req = new IncomingMessage(socket);
	req.method = method;
	req.url = url;
	req.headers = { host: "localhost:3000", ...headers };

	if (METHODS_WITH_BODY.has(method)) {
		if (body !== undefined) {
			req.push(body);
		}
		req.push(null);
	}

	return req;
}

function createMockResponse(): {
	res: ServerResponse;
	getOutput: () => { statusCode: number; headers: Record<string, string>; body: string };
} {
	const chunks: Buffer[] = [];
	let statusCode = 200;
	const responseHeaders: Record<string, string> = {};

	const socket = new Socket();
	const res = new ServerResponse(new IncomingMessage(socket));

	const originalWriteHead = res.writeHead.bind(res);
	res.writeHead = ((code: number, hdrs?: Record<string, string>) => {
		statusCode = code;
		if (hdrs !== undefined) {
			for (const [k, v] of Object.entries(hdrs)) {
				responseHeaders[k] = v;
			}
		}
		return originalWriteHead(code, hdrs);
	}) as typeof res.writeHead;

	const originalEnd = res.end.bind(res);
	res.end = ((chunk?: unknown) => {
		if (typeof chunk === "string") {
			chunks.push(Buffer.from(chunk));
		} else if (chunk instanceof Buffer) {
			chunks.push(chunk);
		}
		return originalEnd();
	}) as typeof res.end;

	return {
		res,
		getOutput: () => ({
			statusCode,
			headers: responseHeaders,
			body: Buffer.concat(chunks).toString(),
		}),
	};
}

describe("toWebRequest", () => {
	test("converts a GET request with correct URL", async () => {
		const req = createMockRequest({ url: "/about", headers: { host: "localhost:5173" } });
		const webReq = await toWebRequest(req);

		expect(webReq.url).toBe("http://localhost:5173/about");
		expect(webReq.method).toBe("GET");
	});

	test("converts a POST request preserving method", async () => {
		const req = createMockRequest({ method: "POST", url: "/api/users" });
		const webReq = await toWebRequest(req);

		expect(webReq.method).toBe("POST");
		expect(webReq.url).toBe("http://localhost:3000/api/users");
	});

	test("forwards request headers", async () => {
		const req = createMockRequest({
			headers: { "content-type": "application/json", accept: "text/html" },
		});
		const webReq = await toWebRequest(req);

		expect(webReq.headers.get("content-type")).toBe("application/json");
		expect(webReq.headers.get("accept")).toBe("text/html");
	});

	test("uses http protocol by default", async () => {
		const req = createMockRequest({ url: "/test" });
		const webReq = await toWebRequest(req);

		expect(webReq.url).toMatch(/^http:\/\//);
	});

	test("includes body for POST requests", async () => {
		const body = JSON.stringify({ name: "test" });
		const req = createMockRequest({
			method: "POST",
			url: "/api/data",
			headers: { "content-type": "application/json" },
			body,
		});
		const webReq = await toWebRequest(req);

		expect(webReq.body).not.toBeNull();
	});

	test("does not include body for GET requests", async () => {
		const req = createMockRequest({ method: "GET", url: "/" });
		const webReq = await toWebRequest(req);

		expect(webReq.body).toBeNull();
	});
});

describe("writeResponse", () => {
	test("writes status code to ServerResponse", async () => {
		const { res, getOutput } = createMockResponse();
		const response = new Response("hello", { status: 201 });

		await writeResponse(res, response);

		expect(getOutput().statusCode).toBe(201);
	});

	test("writes response body to ServerResponse", async () => {
		const { res, getOutput } = createMockResponse();
		const response = new Response("hello world");

		await writeResponse(res, response);

		expect(getOutput().body).toBe("hello world");
	});

	test("writes response headers to ServerResponse", async () => {
		const { res, getOutput } = createMockResponse();
		const response = new Response("data", {
			headers: { "content-type": "application/json", "x-custom": "value" },
		});

		await writeResponse(res, response);

		const output = getOutput();
		expect(output.headers["content-type"]).toBe("application/json");
		expect(output.headers["x-custom"]).toBe("value");
	});

	test("handles empty body response", async () => {
		const { res, getOutput } = createMockResponse();
		const response = new Response(null, { status: 204 });

		await writeResponse(res, response);

		expect(getOutput().statusCode).toBe(204);
		expect(getOutput().body).toBe("");
	});
});
