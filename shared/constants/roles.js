/**
 * Shared User Roles across all Yenz applications (Web, Mobile, Backend)
 */
export const ROLES = {
  CUSTOMER: 'CUSTOMER',
  VENDOR: 'VENDOR',
  DELIVERY_PARTNER: 'DELIVERY_PARTNER',
  ADMIN: 'ADMIN'
};

export const ROLE_LABELS = {
  [ROLES.CUSTOMER]: 'Customer',
  [ROLES.VENDOR]: 'Vendor / Store Owner',
  [ROLES.DELIVERY_PARTNER]: 'Delivery Partner',
  [ROLES.ADMIN]: 'System Administrator'
};

/**
 * Publicly registerable roles (Admin is strictly excluded from public onboarding)
 */
export const PUBLIC_ROLES = [
  ROLES.CUSTOMER,
  ROLES.VENDOR,
  ROLES.DELIVERY_PARTNER
];
