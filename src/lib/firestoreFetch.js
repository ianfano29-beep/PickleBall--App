import { getDoc, getDocs } from "firebase/firestore";

/**
 * Use normal Firestore reads (not getDocFromCache / getDocsFromCache alone).
 * Cache-only reads can return empty or stale snapshots and skip the server,
 * which breaks lists (users, tournaments, registrations, brackets).
 * `getDoc` / `getDocs` still benefit from persistent local cache when enabled,
 * but resolve against the backend when online.
 */
export function getDocCachedFirst(docRef) {
    return getDoc(docRef);
}

export function getDocsCachedFirst(queryRef) {
    return getDocs(queryRef);
}
