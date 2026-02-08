import { supabase } from './supabase'

/**
 * Call a Supabase Edge Function with the current user's JWT.
 * Returns the parsed JSON response or throws an error.
 */
export async function callEdgeFunction<T = Record<string, unknown>>(
  functionName: string,
  body?: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' }
  })

  if (error) {
    throw new Error(error.message || `Error calling ${functionName}`)
  }

  return data as T
}

/**
 * Open a Paddle Checkout for a subscription plan.
 * Opens the checkout URL in the user's default browser.
 */
export async function checkoutSubscription(planType: string): Promise<void> {
  const data = await callEdgeFunction<{ url: string }>('create-checkout', {
    type: 'subscription',
    plan_type: planType
  })

  if (data.url) {
    window.api.shell.openExternal(data.url)
  } else {
    throw new Error('No checkout URL received')
  }
}

/**
 * Open a Paddle Checkout for a credit package purchase.
 * Opens the checkout URL in the user's default browser.
 */
export async function checkoutCreditPackage(packageId: string): Promise<void> {
  const data = await callEdgeFunction<{ url: string }>('create-checkout', {
    type: 'credit_package',
    package_id: packageId
  })

  if (data.url) {
    window.api.shell.openExternal(data.url)
  } else {
    throw new Error('No checkout URL received')
  }
}

/**
 * Open the Paddle Customer Portal for managing subscription.
 * Opens the portal URL in the user's default browser.
 */
export async function openCustomerPortal(): Promise<void> {
  const data = await callEdgeFunction<{ url: string }>('customer-portal')

  if (data.url) {
    window.api.shell.openExternal(data.url)
  } else {
    throw new Error('No portal URL received')
  }
}
