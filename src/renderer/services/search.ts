import { unwrap } from './api';
import { GlobalSearchResults } from '../types';

export async function globalSearch(query: string): Promise<GlobalSearchResults> {
  return unwrap(await window.electronAPI.search.global(query));
}
