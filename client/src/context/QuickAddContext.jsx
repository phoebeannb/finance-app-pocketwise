import { createContext, useContext } from "react";

// open() shows the Add transaction form. refresh() reloads the page you're on.
export const QuickAddContext = createContext({ open: () => {}, refresh: () => {} });
export const useQuickAdd = () => useContext(QuickAddContext);