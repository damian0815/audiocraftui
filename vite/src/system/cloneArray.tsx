
export function cloneArray(items: Array<unknown>): Array<unknown> {
    return items.map(item => Array.isArray(item) ? cloneArray(item) : item);
}
