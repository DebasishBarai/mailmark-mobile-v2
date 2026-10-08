import { useAuth } from '@clerk/expo';
import { useAction } from 'convex/react';
import { useCallback, useEffect, useState } from 'react';
import type { PurchasesPackage } from 'react-native-purchases';

import { api } from '@/lib/convex/api';
import type { Subscription } from '@/lib/convex/types';
import { buy, loadPlanPackages, purchasesAvailable, restore, type StorePlan } from '@/lib/purchases';

type Busy = StorePlan | 'restore' | null;

/**
 * The store's plans for the paywall and the billing screen: localized prices,
 * buying, restoring, and telling the backend straight after so the plan
 * applies without waiting for RevenueCat's webhook.
 */
export function useStorePlans() {
  const { userId } = useAuth();
  const syncMine = useAction(api.storeSubscriptions.syncMine);
  const [packages, setPackages] = useState<Partial<Record<StorePlan, PurchasesPackage>>>({});
  const [loading, setLoading] = useState(purchasesAvailable);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);

  const load = useCallback(
    () =>
      userId
        ? loadPlanPackages(userId).then(
            (loaded) => {
              setPackages(loaded);
              setLoadError(null);
            },
            () => setLoadError('Could not load plans from the store. Check your connection and try again.'),
          )
        : Promise.resolve(),
    [userId],
  );

  useEffect(() => {
    if (!purchasesAvailable) return;
    let alive = true;
    void load().finally(() => {
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [load]);

  const reload = useCallback(async () => {
    if (!purchasesAvailable) return;
    setLoading(true);
    await load();
    setLoading(false);
  }, [load]);

  /** Buy a plan. Resolves true once bought and synced, false if cancelled. */
  const purchase = useCallback(
    async (plan: StorePlan, current?: Pick<Subscription, 'store' | 'storeProductId'> | null) => {
      const pkg = packages[plan];
      if (!userId || !pkg) throw new Error('This plan is not available in the store right now.');
      setBusy(plan);
      try {
        const bought = await buy(userId, pkg, current);
        if (bought) await syncMine({});
        return bought;
      } finally {
        setBusy(null);
      }
    },
    [packages, userId, syncMine],
  );

  const restorePurchases = useCallback(async () => {
    if (!userId) return;
    setBusy('restore');
    try {
      await restore(userId);
      await syncMine({});
    } finally {
      setBusy(null);
    }
  }, [userId, syncMine]);

  return { available: purchasesAvailable, packages, loading, loadError, reload, busy, purchase, restorePurchases };
}
