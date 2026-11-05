/**
 * Ethiopian Phone Number Validation Utility
 * Supports:
 * - 09xxxxxxxx (Ethio telecom - 10 digits)
 * - 07xxxxxxxx (Safaricom Ethiopia - 10 digits)
 * - +2519xxxxxxxx / +2517xxxxxxxx (International format - 13 chars)
 * - 2519xxxxxxxx / 2517xxxxxxxx (Country code format - 12 digits)
 */

export const isEthiopianPhone = (phone) => {
  if (!phone) return false;
  const clean = String(phone).replace(/[\s\-()]/g, "");
  return /^(\+251|251|0)?[79]\d{8}$/.test(clean);
};

export const ETHIOPIAN_PHONE_PLACEHOLDER = "09xxxxxxxx or +251 9xxxxxxxx";
export const ETHIOPIAN_PHONE_ERROR = "Please enter a valid Ethiopian phone number (e.g. 0911234567 or +251911234567)";

