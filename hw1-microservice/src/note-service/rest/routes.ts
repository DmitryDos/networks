import { HttpHeaders } from "../../http-client/lib/headers";
import { Handler, HttpRequest, HttpResponse } from "../../http-client/lib/message";
import { Note, NoteInput, NoteNotFoundError, PreconditionFailedError, etagOf } from "../note";
import { renderNotesText } from "./textView";
import type { NoteService } from "../noteService";

export function createNoteRoutes(service: NoteService): Handler {
    return async (request) => {
        if (request.version === "HTTP/0.9") {
            return {
                status: 200,
                headers: new HttpHeaders(),
                body: Buffer.from(renderNotesText(service, request.path), "utf8"),
            };
        }
        try {
            return await route(service, request);
        } catch (error) {
            if (error instanceof NoteNotFoundError) {
                return errorResponse(404, "not found", request);
            }
            if (error instanceof PreconditionFailedError) {
                return errorResponse(412, "precondition failed", request);
            }
            return errorResponse(400, "bad request", request);
        }
    };
}

async function route(service: NoteService, request: HttpRequest): Promise<HttpResponse> {
    const segments = request.path.split("/").filter((segment) => segment.length > 0);
    if (segments[0] !== "notes") {
        return errorResponse(404, "not found", request);
    }

    if (segments.length === 1) {
        if (request.method === "GET") {
            return represent(service.list(), request, 200);
        }
        if (request.method === "POST") {
            const note = service.create(parseInput(request));
            const response = represent(note, request, 201);
            response.headers.set("ETag", etagOf(note));
            response.headers.set("Location", `/notes/${note.id}`);
            return response;
        }
        return methodNotAllowed(request, "GET, POST");
    }

    if (segments.length === 2) {
        const id = segments[1];
        if (request.method === "GET") {
            const note = service.get(id);
            const response = represent(note, request, 200);
            response.headers.set("ETag", etagOf(note));
            return response;
        }
        if (request.method === "PUT") {
            const note = service.update(id, parseInput(request), ifMatch(request));
            const response = represent(note, request, 200);
            response.headers.set("ETag", etagOf(note));
            return response;
        }
        if (request.method === "DELETE") {
            service.delete(id, ifMatch(request));
            return { status: 204, headers: new HttpHeaders(), body: Buffer.alloc(0) };
        }
        return methodNotAllowed(request, "GET, PUT, DELETE");
    }

    return errorResponse(404, "not found", request);
}

function represent(value: Note | Note[], request: HttpRequest, status: number): HttpResponse {
    const headers = new HttpHeaders();
    if (negotiate(request) === "xml") {
        headers.set("Content-Type", "application/xml; charset=utf-8");
        return { status, headers, body: Buffer.from(toXml(value), "utf8") };
    }
    headers.set("Content-Type", "application/json; charset=utf-8");
    return { status, headers, body: Buffer.from(JSON.stringify(value), "utf8") };
}

function negotiate(request: HttpRequest): "json" | "xml" {
    const accept = (request.headers.get("accept") ?? "").toLowerCase();
    if (accept.includes("application/xml") || accept.includes("text/xml")) {
        return "xml";
    }
    return "json";
}

function parseInput(request: HttpRequest): NoteInput {
    const contentType = (request.headers.get("content-type") ?? "").toLowerCase();
    const text = request.body.toString("utf8");
    if (contentType.includes("xml")) {
        return { title: extractTag(text, "title"), content: extractTag(text, "content") };
    }
    const data = text.length > 0 ? JSON.parse(text) : {};
    return { title: String(data.title ?? ""), content: String(data.content ?? "") };
}

function ifMatch(request: HttpRequest): string | undefined {
    return request.headers.get("if-match") ?? undefined;
}

function methodNotAllowed(request: HttpRequest, allow: string): HttpResponse {
    const response = errorResponse(405, "method not allowed", request);
    response.headers.set("Allow", allow);
    return response;
}

function errorResponse(status: number, message: string, request: HttpRequest): HttpResponse {
    const headers = new HttpHeaders();
    if (negotiate(request) === "xml") {
        headers.set("Content-Type", "application/xml; charset=utf-8");
        const body = `<error><status>${status}</status><message>${escapeXml(message)}</message></error>`;
        return { status, headers, body: Buffer.from(body, "utf8") };
    }
    headers.set("Content-Type", "application/json; charset=utf-8");
    return { status, headers, body: Buffer.from(JSON.stringify({ status, message }), "utf8") };
}

function toXml(value: Note | Note[]): string {
    if (Array.isArray(value)) {
        return `<notes>${value.map(noteToXml).join("")}</notes>`;
    }
    return noteToXml(value);
}

function noteToXml(note: Note): string {
    return (
        `<note>` +
        `<id>${escapeXml(note.id)}</id>` +
        `<title>${escapeXml(note.title)}</title>` +
        `<content>${escapeXml(note.content)}</content>` +
        `<version>${note.version}</version>` +
        `<createdAt>${note.createdAt}</createdAt>` +
        `<updatedAt>${note.updatedAt}</updatedAt>` +
        `</note>`
    );
}

function extractTag(xml: string, tag: string): string {
    const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(xml);
    return match ? unescapeXml(match[1]) : "";
}

function escapeXml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function unescapeXml(value: string): string {
    return value
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, "&");
}
