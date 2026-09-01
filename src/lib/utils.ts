export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export function getPublicUrl() {
  return window.location.origin + window.location.pathname;
}

