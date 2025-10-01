import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import "./styles.css";

import { ThemeProvider } from "./components/ThemeProvider.tsx";
import { router } from "./router.tsx";

const rootElement = document.getElementById("app");
if (rootElement && !rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(
		<StrictMode>
			<ThemeProvider defaultTheme="dark" storageKey="concertify-ui-theme">
				<RouterProvider router={router} />
			</ThemeProvider>
		</StrictMode>,
	);
}
