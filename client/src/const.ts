export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Return local login page URL (custom auth, no OAuth)
export const getLoginUrl = (_returnPath?: string) => {
  return '/login';
};
