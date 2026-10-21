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

function push(type, message, ms, action) {
  if (!message) return;
  // The same plain message again: show it fresh. Undo messages are always kept separate.
  if (!action) items = items.filter((t) => !(t.type === type && t.message === message && !t.action));
  const id = nextId++;
  items = [...items.slice(-3), { id, type, message, action }];
  emit();
  setTimeout(() => dismiss(id), ms);
  return id;
}

export const toast = {
  success: (message) => push("success", message, 4000),
  error: (message) => push("error", message, 8000),
  undo: (message, onUndo, ms = 5000) => push("success", message, ms, { label: "Undo", onClick: onUndo }),
};