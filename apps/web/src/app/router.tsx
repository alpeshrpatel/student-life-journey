import { createBrowserRouter, type RouteObject } from "react-router";
import { PlaceholderScreen } from "./placeholder-screen.js";

export const routes: RouteObject[] = [
  { path: "/", element: <PlaceholderScreen titleKey="home" /> },
  { path: "*", element: <PlaceholderScreen titleKey="notFound" /> },
];

export const router = createBrowserRouter(routes);
