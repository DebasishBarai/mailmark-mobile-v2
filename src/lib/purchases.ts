/**
 * In-app purchases through RevenueCat (react-native-purchases).
 *
 * App Review (3.1.1) and Google Play only allow a native app to sell a digital
 * subscription through the store's own billing, so on iOS and Android the
 * plans are store subscriptions. RevenueCat validates the receipts; the
 * backend (convex/storeSubscriptions.ts in the website repo) reads the result
 * from RevenueCat and writes the plan to the same subscriptions row the web
 * checkout uses, so plan limits work exactly as they do for web billing.
 *
 * RevenueCat's app user id is the Clerk user id, which is what the backend
 * looks the user up by. Products must carry their plan in the id
 * (mailmark_starter_monthly, mailmark_pro_monthly, mailmark_business_monthly)
 * and be in the current offering, with entitlements named after the plans.
 *
 * Until EXPO_PUBLIC_REVENUECAT_IOS_KEY / EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
 * are set, `purchasesAvailable` is false and the billing screens keep the
 * website's checkout.
 */

import { Linking, Platform } from 'react-native';
import Purchases, { PURCHASES_ERROR_CODE, type PurchasesPackage } from 'react-native-purchases';

import type { Subscription } from '@/lib/convex/types';

export type StorePlan = 'starter' | 'pro' | 'business';

function apiKey(): string {
  if (Platform.OS === 'ios') return process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
  if (Platform.OS === 'android') return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';
  return '';
}

/** Whether this build sells plans through the App Store / Google Play. */
export const purchasesAvailable = apiKey() !== '';

/** Which store this build buys from, for copy. */
export const storeName = Platform.OS === 'ios' ? 'the App Store' : 'Google Play';

let configuredFor: string | null = null;
let identifying: Promise<void> | null = null;

/**
 * Configure RevenueCat for a signed-in user, or switch it to them. Called
 * before every store call, so it is cheap after the first time. Concurrent
 * calls share one attempt, so configure never runs twice.
 */
export async function identify(clerkUserId: string): Promise<void> {
  if (!purchasesAvailable) return;
  while (identifying) await identifying;
  if (configuredFor === clerkUserId) return;
  identifying = (async () => {
    if (!(await Purchases.isConfigured())) {
      Purchases.configure({ apiKey: apiKey(), appUserID: clerkUserId });
    } else {
      await Purchases.logIn(clerkUserId);
    }
    configuredFor = clerkUserId;
  })();
  try {
    await identifying;
  } finally {
    identifying = null;
  }
}

/** Forget the user on sign-out, so the next account on this phone starts clean. */
export async function forget(): Promise<void> {
  if (!purchasesAvailable || configuredFor === null) return;
  configuredFor = null;
  try {
    await Purchases.logOut();
  } catch {
    // logOut throws for an anonymous customer, which is already the goal.
  }
}

const PLAN_IN_ID = /(?:^|[._:-])(starter|pro|business)(?:[._:-]|$)/;

/** The plan a store product sells, from its id. */
export function planOfProduct(productId: string | undefined): StorePlan | undefined {
  const match = productId?.toLowerCase().match(PLAN_IN_ID);
  return match ? (match[1] as StorePlan) : undefined;
}

/** The current offering's package for each plan, with store-localized prices. */
export async function loadPlanPackages(clerkUserId: string): Promise<Partial<Record<StorePlan, PurchasesPackage>>> {
  await identify(clerkUserId);
  const offerings = await Purchases.getOfferings();
  const packages = offerings.current?.availablePackages ?? [];
  const byPlan: Partial<Record<StorePlan, PurchasesPackage>> = {};
  for (const pkg of packages) {
    const plan = planOfProduct(pkg.product.identifier);
    if (plan && !byPlan[plan]) byPlan[plan] = pkg;
  }
  return byPlan;
}

/**
 * Buy a plan. Resolves false when the user cancels the store sheet.
 *
 * Moving between plans: on iOS the three products share a subscription group,
 * so StoreKit swaps them by itself. Google Play needs the product being
 * replaced, which is the row's storeProductId.
 */
export async function buy(
  clerkUserId: string,
  pkg: PurchasesPackage,
  current?: Pick<Subscription, 'store' | 'storeProductId'> | null,
): Promise<boolean> {
  await identify(clerkUserId);
  const replacing =
    Platform.OS === 'android' && current?.store === 'play_store' && current.storeProductId
      ? { oldProductIdentifier: current.storeProductId.split(':')[0] }
      : null;
  try {
    await Purchases.purchasePackage(pkg, null, replacing);
    return true;
  } catch (err) {
    if (isCancelled(err)) return false;
    throw err;
  }
}

/** Restore purchases made under this store account (App Review requires it). */
export async function restore(clerkUserId: string): Promise<void> {
  await identify(clerkUserId);
  await Purchases.restorePurchases();
}

/** Open the store's own subscription management. */
export async function manageSubscriptions(): Promise<void> {
  if (Platform.OS === 'ios') {
    await Purchases.showManageSubscriptions();
    return;
  }
  await Linking.openURL('https://play.google.com/store/account/subscriptions?package=dev.mailmark.app');
}

function isCancelled(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: unknown; userCancelled?: unknown };
  return e.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR || e.userCancelled === true;
}

/** "7-day free trial" for a free intro offer, or undefined when there is none. */
export function freeTrialLabel(pkg: PurchasesPackage | undefined): string | undefined {
  const intro = pkg?.product.introPrice;
  if (!intro || intro.price !== 0) return undefined;
  const units = intro.periodNumberOfUnits * Math.max(intro.cycles, 1);
  const unit = intro.periodUnit.toLowerCase();
  return `${units}-${unit} free trial`;
}
