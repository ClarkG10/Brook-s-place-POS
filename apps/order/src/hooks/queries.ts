import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

/** Store branding + theme. Rarely changes → long stale time. */
export function useSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: api.settings, staleTime: 5 * 60_000 });
}

/**
 * Menu with live availability. Stale-while-revalidate: show instantly from cache,
 * refetch in the background and while the tab is focused so sold-out states stay fresh.
 */
export function useMenu() {
  return useQuery({
    queryKey: ['menu'],
    queryFn: api.menu,
    staleTime: 20_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}
