import { NoteNotFoundError } from "../note";
import type { NoteService } from "../noteService";

export function renderNotesText(service: NoteService, path: string): string {
    const segments = path.split("/").filter((segment) => segment.length > 0);
    if (segments[0] !== "notes") {
        return "not found\n";
    }
    if (segments.length === 1) {
        const notes = service.list();
        if (notes.length === 0) {
            return "(no notes)\n";
        }
        return notes.map((note) => `${note.id}\t${note.title}\n`).join("");
    }
    try {
        const note = service.get(segments[1]);
        return `id: ${note.id}\ntitle: ${note.title}\nversion: ${note.version}\n\n${note.content}\n`;
    } catch (error) {
        if (error instanceof NoteNotFoundError) {
            return "not found\n";
        }
        throw error;
    }
}
