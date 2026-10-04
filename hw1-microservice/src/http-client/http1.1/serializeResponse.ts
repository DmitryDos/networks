import { CRLF } from "../lib/framing";
import { statusText } from "../lib/status";
import { HttpResponse } from "../lib/message";

export function serializeResponse(response: HttpResponse): Buffer {
    const reason = response.reason ?? statusText(response.status);
    const lines = [`HTTP/1.1 ${response.status} ${reason}`];
    for (const [name, value] of response.headers.entries()) {
        lines.push(`${name}: ${value}`);
    }
    if (!response.headers.has("content-length") && !response.headers.has("transfer-encoding")) {
        lines.push(`Content-Length: ${response.body.length}`);
    }
    const head = Buffer.from(lines.join(CRLF) + CRLF + CRLF, "latin1");
    return Buffer.concat([head, response.body]);
}
