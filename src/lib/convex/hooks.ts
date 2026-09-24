/**
 * Data hooks every screen reads through.
 *
 * Convex queries are live subscriptions, so there is no cache to invalidate:
 * a mutation anywhere (this device, the website, the SES webhook) re-renders
 * the screens that depend on it. These wrappers add the two things screens
 * need on top of that: an explicit error state instead of a thrown render
 * error, and a way to re-subscribe (retry / pull-to-refresh).
 *
 * They wrap the object-form hooks convex/react currently exports as
 * `*_experimental`, so if that API is renamed only this file changes.
 */

import {
  useConvex,
  usePaginatedQuery_experimental,
  useQuery_experimental,
} from 'convex/react';
import type { FunctionArgs, FunctionReference, FunctionReturnType } from 'convex/server';
import type { PaginatedQueryArgs, PaginatedQueryReference } from 'convex/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { api } from './api';
import { isMissingFunctionError } from './errors';

import type { MobileCapabilities } from './types';

export type LiveQuery<T> =
  | { status: 'loading'; data: undefined; error: undefined }
  | { status: 'success'; data: T; error: undefined }
  | { status: 'error'; data: undefined; error: Error };

export function useLiveQuery<Query extends FunctionReference<'query'>>(
  query: Query,
  args: FunctionArgs<Query> | 'skip',
): LiveQuery<FunctionReturnType<Query>> {
  const result = useQuery_experimental({ query, args });
  const data = result.status === 'success' ? result.data : undefined;
  const error = result.status === 'error' ? result.error : undefined;
  return useMemo<LiveQuery<FunctionReturnType<Query>>>(() => {
    if (error) return { status: 'error', data: undefined, error };
    if (result.status === 'success') return { status: 'success', data, error: undefined };
    return { status: 'loading', data: undefined, error: undefined };
  }, [result.status, data, error]);
}

export type LivePaginated<Item> = {
  items: Item[];
  status: 'loading' | 'success' | 'error';
  error: Error | undefined;
  canLoadMore: boolean;
  isLoadingMore: boolean;
  loadMore: () => void;
};

export function useLivePaginated<Query extends PaginatedQueryReference>(
  query: Query,
  args: PaginatedQueryArgs<Query> | 'skip',
  pageSize = 30,
): LivePaginated<FunctionReturnType<Query>['page'][number]> {
  const result = usePaginatedQuery_experimental({ query, args, initialNumItems: pageSize });
  const { loadMore: load } = result;
  const loadMore = useCallback(() => load(pageSize), [load, pageSize]);

  const isLoadingMore = result.status === 'pending' && !!result.data;
  const items = (result.data ?? EMPTY) as FunctionReturnType<Query>['page'][number][];
  const status = result.status === 'pending' ? (result.data ? 'success' : 'loading') : result.status;
  return useMemo(
    () => ({ items, status, error: result.error, canLoadMore: result.canLoadMore, isLoadingMore, loadMore }),
    [items, status, result.error, result.canLoadMore, isLoadingMore, loadMore],
  );
}

const EMPTY: never[] = [];

/**
 * A key that changes when the user asks to retry or pulls to refresh.
 * Put it on the component that owns the subscriptions to re-create them.
 */
export function useRefreshKey(settleMs = 600) {
  const [key, setKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setKey((k) => k + 1);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setRefreshing(false), settleMs);
  }, [settleMs]);

  return { key, refreshing, refresh };
}

const NO_EXTENSION: MobileCapabilities = { version: 0, push: false, campaignRecipients: false };

/**
 * Which parts of the optional mobile backend extension are deployed.
 *
 * Asked once with a one-shot query rather than a subscription, because a
 * subscription to a function that does not exist surfaces as an error on
 * every screen that mounts it. Absent extension => every capability false,
 * and the features that need it explain what is missing instead of failing.
 */
export function useMobileCapabilities(): MobileCapabilities | undefined {
  const convex = useConvex();
  const [caps, setCaps] = useState<MobileCapabilities | undefined>(capabilitiesCache);

  useEffect(() => {
    if (capabilitiesCache) return;
    let cancelled = false;
    convex
      .query(api.mobile.capabilities, {})
      .then((value) => {
        capabilitiesCache = value;
        if (!cancelled) setCaps(value);
      })
      .catch((err) => {
        const value = isMissingFunctionError(err) ? NO_EXTENSION : { ...NO_EXTENSION, version: -1 };
        if (isMissingFunctionError(err)) capabilitiesCache = value;
        if (!cancelled) setCaps(value);
      });
    return () => {
      cancelled = true;
    };
  }, [convex]);

  return caps;
}

let capabilitiesCache: MobileCapabilities | undefined;
