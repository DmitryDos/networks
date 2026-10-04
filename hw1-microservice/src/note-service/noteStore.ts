import { Note } from "./note";

export interface NotesStore {
    list(): Note[];
    get(id: string): Note | undefined;
    insert(note: Note): void;
    replace(note: Note): void;
    remove(id: string): boolean;
}

export class InMemoryNotesStore implements NotesStore {
    private readonly notes = new Map<string, Note>();

    list(): Note[] {
        return [...this.notes.values()];
    }

    get(id: string): Note | undefined {
        return this.notes.get(id);
    }

    insert(note: Note): void {
        this.notes.set(note.id, note);
    }

    replace(note: Note): void {
        this.notes.set(note.id, note);
    }

    remove(id: string): boolean {
        return this.notes.delete(id);
    }
}
