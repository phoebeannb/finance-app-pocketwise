let nextId = 1;
let items = [];
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn(items));

export const subscribe = (fn) => {
  listeners.add(fn);
  fn(items);
  return () => listeners.delete(fn);
};

export const dismiss = (id) => {
  items = items.filter((t) => t.id !== id);
  emit();
};

function push(type, message, ms) {
  if (!message) return;
  items = items.filter((t) => !(t.type === type && t.message === message)); // same message again: show it fresh
  const id = nextId++;
  items = [...items.slice(-3), { id, type, message }];
  emit();
  setTimeout(() => dismiss(id), ms);
}

export const toast = {
  success: (message) => push("success", message, 4000),
  error: (message) => push("error", message, 8000),
};