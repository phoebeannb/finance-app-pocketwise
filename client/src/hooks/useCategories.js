import { useCallback, useEffect, useState } from "react";
import api from "../api/axios";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "../utils/categories";

export default function useCategories() {
  const [custom, setCustom] = useState([]);

  const reload = useCallback(
    () => api.get("/categories").then(({ data }) => setCustom(data)).catch(() => {}),
    []
  );
  useEffect(() => { reload(); }, [reload]);

  const merge = (base, type) => [
    ...base,
    ...custom
      .filter((c) => c.type === type)
      .map((c) => c.name)
      .filter((n) => !base.some((b) => b.toLowerCase() === n.toLowerCase())),
  ];

  return { expense: merge(EXPENSE_CATEGORIES, "expense"), income: merge(INCOME_CATEGORIES, "income"), reload };
}