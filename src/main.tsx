import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import "./styles.css";

import App from "./App.tsx";
import { ThemeProvider } from "./components/ThemeProvider.tsx";

const rootElement = document.getElementById("app");
if (rootElement && !rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(
		<StrictMode>
			<ThemeProvider defaultTheme="dark" storageKey="concertify-ui-theme">
				<App />
			</ThemeProvider>
		</StrictMode>,
	);
}
