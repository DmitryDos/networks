import { createHash } from "node:crypto";

export interface Note {
    id: string;
    title: string;
    content: string;
    version: number;
    createdAt: string;
    updatedAt: string;
}

export interface NoteInput {
    title: string;
    content: string;
}

export interface NotePatch {
    title?: string;
    content?: string;
}

export class NoteNotFoundError extends Error {
    constructor(public readonly id: string) {
        super(`note not found: ${id}`);
        this.name = "NoteNotFoundError";
    }
}

export class PreconditionFailedError extends Error {
    constructor(public readonly id: string) {
        super(`precondition failed: ${id}`);
        this.name = "PreconditionFailedError";
    }
}

export function etagOf(note: Note): string {
    const digest = createHash("sha1").update(`${note.id}:${note.version}`).digest("hex");
    return `"${digest}"`;
}
