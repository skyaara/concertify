import { createRootRoute, createRoute, createRouter, Outlet } from "@tanstack/react-router";
import { HomePage } from "./pages/HomePage";
import { StereoPlayer } from "./pages/StereoPlayer";

// Create a root route
const rootRoute = createRootRoute({
	component: () => <Outlet />,
});

// Create an index route
const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	component: HomePage,
});

// Create the stereo player route
const stereoPlayerRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/stereo-player",
	component: StereoPlayer,
});

// Create the route tree
const routeTree = rootRoute.addChildren([indexRoute, stereoPlayerRoute]);

// Create the router
export const router = createRouter({ routeTree });

// Register the router instance for type safety
declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}
