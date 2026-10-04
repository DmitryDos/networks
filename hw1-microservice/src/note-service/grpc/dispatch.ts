import path from "node:path";
import protobuf from "protobufjs";
import { HeaderField, Http2Request, Http2Response } from "../../http-client/http2.0/message";
import { Note, NoteNotFoundError, PreconditionFailedError } from "../note";
import type { NoteService } from "../noteService";

const root = protobuf.loadSync(path.resolve(__dirname, "../../../notes.proto"));
const types = {
    Empty: root.lookupType("notes.Empty"),
    NoteId: root.lookupType("notes.NoteId"),
    NoteInput: root.lookupType("notes.NoteInput"),
    NoteUpdate: root.lookupType("notes.NoteUpdate"),
    Note: root.lookupType("notes.Note"),
    NoteList: root.lookupType("notes.NoteList"),
};

class GrpcUnimplemented extends Error {
    constructor(public readonly method: string) {
        super(`unimplemented: ${method}`);
    }
}

export function handleGrpc(service: NoteService, request: Http2Request): Http2Response {
    const method = request.path.split("/").pop() ?? "";
    try {
        const reply = dispatch(service, method, unframe(request.body));
        return grpcResponse(frame(reply), 0, "");
    } catch (error) {
        const [status, message] = grpcError(error);
        return grpcResponse(Buffer.alloc(0), status, message);
    }
}

function dispatch(service: NoteService, method: string, message: Buffer): Buffer {
    switch (method) {
        case "List":
            return encode("NoteList", { notes: service.list().map(toMessage) });
        case "Get":
            return encode("Note", toMessage(service.get(decode("NoteId", message).id)));
        case "Create": {
            const input = decode("NoteInput", message);
            return encode("Note", toMessage(service.create({ title: input.title ?? "", content: input.content ?? "" })));
        }
        case "Update": {
            const input = decode("NoteUpdate", message);
            const note = service.update(
                input.id,
                { title: input.title, content: input.content },
                input.ifMatch ? input.ifMatch : undefined,
            );
            return encode("Note", toMessage(note));
        }
        case "Delete":
            service.delete(decode("NoteId", message).id);
            return encode("Empty", {});
        default:
            throw new GrpcUnimplemented(method);
    }
}

function decode(type: keyof typeof types, bytes: Buffer): Record<string, string> {
    return types[type].toObject(types[type].decode(bytes)) as Record<string, string>;
}

function encode(type: keyof typeof types, value: object): Buffer {
    return Buffer.from(types[type].encode(types[type].fromObject(value)).finish());
}

function toMessage(note: Note): object {
    return {
        id: note.id,
        title: note.title,
        content: note.content,
        version: note.version,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
    };
}

function grpcResponse(body: Buffer, status: number, message: string): Http2Response {
    const trailers: HeaderField[] = [{ name: "grpc-status", value: String(status) }];
    if (message) {
        trailers.push({ name: "grpc-message", value: message });
    }
    return {
        status: 200,
        headers: [{ name: "content-type", value: "application/grpc+proto" }],
        body,
        trailers,
    };
}

function grpcError(error: unknown): [number, string] {
    if (error instanceof NoteNotFoundError) {
        return [5, "not found"];
    }
    if (error instanceof PreconditionFailedError) {
        return [9, "precondition failed"];
    }
    if (error instanceof GrpcUnimplemented) {
        return [12, error.message];
    }
    return [13, "internal"];
}

function frame(message: Buffer): Buffer {
    const header = Buffer.alloc(5);
    header.writeUInt8(0, 0);
    header.writeUInt32BE(message.length, 1);
    return Buffer.concat([header, message]);
}

function unframe(body: Buffer): Buffer {
    if (body.length < 5) {
        return Buffer.alloc(0);
    }
    const length = body.readUInt32BE(1);
    return body.subarray(5, 5 + length);
}
