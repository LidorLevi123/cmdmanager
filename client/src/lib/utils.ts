import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getWebSocketUrl(path: string): string {
  const isDev = process.env.NODE_ENV === 'development';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = isDev ? `localhost:${window.location.port}` : window.location.host;
  return `${protocol}//${host}${path}`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleString();
}
