import { toast } from "./toast";

const pending = new Map();

/*
  Hides the item right away and deletes it for real after 5 seconds, unless you press Undo.
    key      a unique name for this delete
    message  what the green bar says
    hide     removes the item from the screen
    restore  puts the screen back (usually a reload)
    run      the real delete call
    done     runs after the real delete worked
*/
export function undoableDelete({ key, message, hide, restore, run, done, ms = 5000 }) {
  hide();
  const timer = setTimeout(async () => {
    pending.delete(key);
    try {
      await run();
      done?.();
    } catch (err) {
      restore?.();
      const why = err?.response?.data?.message;
      toast.error(why ? `${why} It was put back.` : "We couldn't delete that, so it was put back. Please try again.");
    }
  }, ms);
  pending.set(key, timer);

  toast.undo(message, () => {
    clearTimeout(pending.get(key));
    pending.delete(key);
    restore?.();
    toast.success("Restored.");
  }, ms);
}