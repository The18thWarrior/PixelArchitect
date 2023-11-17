'use client'

import { IDBPDatabase, openDB } from 'idb';

let dbPromise: Promise<IDBPDatabase<unknown>>;

const getDb = async () => {
  // Better than Next.js undocumented process.browser.
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser) throw new Error('IndexedDB can be used only in a browser.');

  if (!dbPromise) {
    dbPromise = openDB('keyval-store', 1, {
      upgrade(db) {
        db.createObjectStore('keyval');
      },
    });
  }

  return dbPromise;
}

export async function get(key: IDBKeyRange | IDBValidKey) {
  return (await getDb()).get('keyval', key);
}
export async function set(key: IDBKeyRange | IDBValidKey , val: any) {
  return (await getDb()).put('keyval', val, key);
}
export async function del(key: IDBKeyRange | IDBValidKey) {
  return (await getDb()).delete('keyval', key);
}
export async function clear() {
  return (await getDb()).clear('keyval');
}
export async function keys() {
  return (await getDb()).getAllKeys('keyval');
}