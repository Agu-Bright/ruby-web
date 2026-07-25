'use client';

/**
 * useBusinessVisibility — decides which catalog surfaces the current
 * business should see. Mirror of mobile `useCategoryProfile()`.
 *
 * Backend rules (per P90):
 *   - `sellsProducts` is the authoritative flag for Products. Defaults to
 *     `true` for ORDER_DELIVERY subcategories, `false` for the rest.
 *     Merchants can override on their business profile — e.g. a salon
 *     (VISIT_ONLY) that also sells shampoo can flip it on.
 *   - Services show whenever the business model is `VISIT_ONLY` or
 *     `BOOKING_VISIT`. ORDER_DELIVERY businesses don't book.
 *
 * While the hydrated fields are still loading (right after login, before
 * `refreshBusinessProfile` resolves), `isReady` is `false` and we default
 * to showing every catalog entry — hiding a real merchant's Products tab
 * because we don't know their model yet is worse than briefly showing
 * both.
 */

import { useBusinessAuth, type BusinessModel } from './business-auth-context';

export interface BusinessVisibility {
  /** True when the sidebar has enough data to hide anything. */
  isReady: boolean;
  showProducts: boolean;
  showServices: boolean;
  isOrderDelivery: boolean;
  isVisitOnly: boolean;
  isBookingVisit: boolean;
  businessModel: BusinessModel | undefined;
}

export function useBusinessVisibility(): BusinessVisibility {
  const { business } = useBusinessAuth();
  const businessModel = business?.businessModel;
  const sellsProducts = business?.sellsProducts;

  // Not hydrated yet — default to showing everything so the sidebar
  // doesn't briefly hide a valid tab and jerk on hydration.
  const isReady = !!businessModel;
  if (!isReady) {
    return {
      isReady,
      showProducts: true,
      showServices: true,
      isOrderDelivery: false,
      isVisitOnly: false,
      isBookingVisit: false,
      businessModel: undefined,
    };
  }

  const isOrderDelivery = businessModel === 'ORDER_DELIVERY';
  const isVisitOnly = businessModel === 'VISIT_ONLY';
  const isBookingVisit = businessModel === 'BOOKING_VISIT';

  // `sellsProducts` overrides the model default; if undefined, fall back
  // to the model-based default (ORDER_DELIVERY = true, otherwise false).
  const showProducts =
    typeof sellsProducts === 'boolean' ? sellsProducts : isOrderDelivery;
  const showServices = isVisitOnly || isBookingVisit;

  return {
    isReady,
    showProducts,
    showServices,
    isOrderDelivery,
    isVisitOnly,
    isBookingVisit,
    businessModel,
  };
}
