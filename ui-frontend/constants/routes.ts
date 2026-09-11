import { NavigationItem } from "~~/types/types";

export const enum APP_ROUTES {
  HOME = "/",
  RANKINGS = "/rankings",
  LAUNCH = "/launch",
  SUPPORT = "/support",
}

export const routerItemsList: NavigationItem[] = [
  {
    id: "home",
    label: "Home",
    href: "/",
  },
  {
    id: "launch",
    label: "Launch",
    href: "/launch",
  },
  {
    id: "tokens",
    label: "Tokens",
    href: "/tokens",
  },
  {
    id: "leaderboards",
    label: "Leaderboards",
    href: "/leaderboards",
  },
];

export const contentPagesList: NavigationItem[] = [];
