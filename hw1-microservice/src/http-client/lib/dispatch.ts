import { HttpHeaders } from "./headers";
import { statusText } from "./status";
import { Handler, HttpRequest, HttpResponse } from "./message";

export async function safeHandle(handler: Handler, request: HttpRequest): Promise<HttpResponse> {
    try {
        return await handler(request);
    } catch {
        return errorResponse(500);
    }
}

export function errorResponse(status: number): HttpResponse {
    const headers = new HttpHeaders();
    headers.set("Content-Type", "text/plain; charset=utf-8");
    const reason = statusText(status);
    return { status, reason, headers, body: Buffer.from(`${status} ${reason}\n`, "utf8") };
}
