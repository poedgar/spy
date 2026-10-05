import { sortByPresence } from '@/realtime/sortByPresence';

test('online users first, each group alphabetical, input untouched', () => {
  const users = [
    { id: 1, name: 'Charlie' },
    { id: 2, name: 'alpha' },
    { id: 3, name: 'Bravo' },
    { id: 4, name: 'Delta' },
  ];

  const sorted = sortByPresence(users, new Set([4, 3]));

  expect(sorted.map((u) => u.id)).toEqual([3, 4, 2, 1]);
  expect(users[0].id).toBe(1);
});
