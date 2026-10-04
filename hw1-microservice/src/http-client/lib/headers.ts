export class HttpHeaders {
    private readonly order: string[] = [];
    private readonly values = new Map<string, string[]>();

    static from(init?: Record<string, string | string[]>): HttpHeaders {
        const headers = new HttpHeaders();
        if (init) {
            for (const [name, value] of Object.entries(init)) {
                const items = Array.isArray(value) ? value : [value];
                for (const item of items) {
                    headers.append(name, item);
                }
            }
        }
        return headers;
    }

    private key(name: string): string {
        return name.toLowerCase();
    }

    has(name: string): boolean {
        return this.values.has(this.key(name));
    }

    get(name: string): string | undefined {
        const list = this.values.get(this.key(name));
        return list ? list.join(", ") : undefined;
    }

    getAll(name: string): string[] {
        return this.values.get(this.key(name)) ?? [];
    }

    set(name: string, value: string): void {
        const key = this.key(name);
        if (!this.values.has(key)) {
            this.order.push(name);
        }
        this.values.set(key, [value]);
    }

    append(name: string, value: string): void {
        const key = this.key(name);
        if (!this.values.has(key)) {
            this.order.push(name);
            this.values.set(key, []);
        }
        this.values.get(key)!.push(value);
    }

    *entries(): IterableIterator<[string, string]> {
        for (const name of this.order) {
            const list = this.values.get(this.key(name)) ?? [];
            for (const value of list) {
                yield [name, value];
            }
        }
    }
}
