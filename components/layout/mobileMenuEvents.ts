export const CLOSE_MOBILE_MENU_EVENT = "born2smile:close-mobile-menu";

export function closeMobileMenu() {
  window.dispatchEvent(new Event(CLOSE_MOBILE_MENU_EVENT));
}
