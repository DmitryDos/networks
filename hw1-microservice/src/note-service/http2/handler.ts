import { HttpHeaders } from "../../http-client/lib/headers";
import { HttpRequest, HttpResponse } from "../../http-client/lib/message";
import { HeaderField, Http2Handler, Http2Request, Http2Response } from "../../http-client/http2.0/message";
import { createNoteRoutes } from "../rest/routes";
import { handleGrpc } from "../grpc/dispatch";
import type { NoteService } from "../noteService";

export function createNoteHttp2Handler(service: NoteService): Http2Handler {
    const rest = createNoteRoutes(service);
    return async (request) => {
        if (request.contentType.includes("application/grpc")) {
            return handleGrpc(service, request);
        }
        const response = await rest(toHttpRequest(request));
        return toHttp2Response(response);
    };
}

function toHttpRequest(request: Http2Request): HttpRequest {
    const headers = new HttpHeaders();
    for (const field of request.headers) {
        if (!field.name.startsWith(":")) {
            headers.append(field.name, field.value);
        }
    }
    return {
        method: request.method,
        target: request.path,
        path: request.path.split("?")[0],
        query: {},
        version: "HTTP/2",
        headers,
        body: request.body,
    };
}

function toHttp2Response(response: HttpResponse): Http2Response {
    const headers: HeaderField[] = [];
    for (const [name, value] of response.headers.entries()) {
        const lower = name.toLowerCase();
        if (lower === "connection" || lower === "keep-alive" || lower === "transfer-encoding") {
            continue;
        }
        headers.push({ name: lower, value });
    }
    return { status: response.status, headers, body: response.body };
}
