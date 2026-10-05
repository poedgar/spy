export function sortByPresence<T extends { id: number; name: string }>(users: T[], online: Set<number>): T[] {
  return [...users].sort((a, b) => {
    const presence = Number(online.has(b.id)) - Number(online.has(a.id));
    return presence !== 0 ? presence : a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}
