import { randomUUID } from "node:crypto";
import { createHttpClient, HttpClient } from "../http-client/httpClient";
import { Note, NoteInput, NotePatch, NoteNotFoundError, PreconditionFailedError, etagOf } from "./note";
import { InMemoryNotesStore, NotesStore } from "./noteStore";
import { createNoteRoutes } from "./rest/routes";
import { createNoteHttp2Handler } from "./http2/handler";

export interface NoteServiceOptions {
    port: number;
}

export class NoteService {
    private readonly store: NotesStore;
    private readonly http: HttpClient;

    constructor(private readonly options: NoteServiceOptions) {
        this.store = new InMemoryNotesStore();
        this.http = createHttpClient();
    }

    list(): Note[] {
        return this.store.list();
    }

    get(id: string): Note {
        const note = this.store.get(id);
        if (!note) {
            throw new NoteNotFoundError(id);
        }
        return note;
    }

    create(input: NoteInput): Note {
        const now = new Date().toISOString();
        const note: Note = {
            id: randomUUID(),
            title: input.title,
            content: input.content,
            version: 1,
            createdAt: now,
            updatedAt: now,
        };
        this.store.insert(note);
        return note;
    }

    update(id: string, patch: NotePatch, ifMatch?: string): Note {
        const current = this.get(id);
        this.ensureMatch(current, ifMatch);
        const updated: Note = {
            ...current,
            title: patch.title ?? current.title,
            content: patch.content ?? current.content,
            version: current.version + 1,
            updatedAt: new Date().toISOString(),
        };
        this.store.replace(updated);
        return updated;
    }

    delete(id: string, ifMatch?: string): void {
        const current = this.get(id);
        this.ensureMatch(current, ifMatch);
        this.store.remove(id);
    }

    start(): void {
        this.http.listen(this.options.port, createNoteRoutes(this), createNoteHttp2Handler(this));
    }

    stop(): void {
        this.http.close();
    }

    private ensureMatch(note: Note, ifMatch?: string): void {
        if (ifMatch === undefined) {
            return;
        }
        const trimmed = ifMatch.trim();
        if (trimmed === "*") {
            return;
        }
        const current = etagOf(note);
        const candidates = trimmed.split(",").map((value) => value.trim());
        if (!candidates.includes(current)) {
            throw new PreconditionFailedError(note.id);
        }
    }
}

export function createNoteService(options: NoteServiceOptions): NoteService {
    return new NoteService(options);
}
