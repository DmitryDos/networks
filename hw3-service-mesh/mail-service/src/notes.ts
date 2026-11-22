export interface Note {
    id: string;
    title: string;
    content: string;
}

export async function fetchNotes(baseUrl: string): Promise<Note[]> {
    const response = await fetch(`${baseUrl}/notes`);
    return (await response.json()) as Note[];
}
