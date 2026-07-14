export type SortingOrder = 'asc' | 'desc'

export function sort<T>(
    items: T[],
    callback: (items: T) => [keyof T],
    order: SortingOrder = 'asc'
): T[] {
    return items.sort((a: T, b: T) =>  {
        const aVal = callback(a);
        const bVal = callback(b);

		if (aVal > bVal) {
			return 1;
		} else if (aVal < bVal) {
			return -1;
		}

        return 0;
    })
}
// const order = 'desc'|'asc'
//example sort(items, (items) => items.name, order)