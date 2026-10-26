import { createContext, useContext } from "react";

// open() shows the Add transaction form. openBill() shows the essential bill form.
export const QuickAddContext = createContext({ open: () => {}, openBill: () => {}, openReceipt: () => {}, refresh: () => {} });
export const useQuickAdd = () => useContext(QuickAddContext);