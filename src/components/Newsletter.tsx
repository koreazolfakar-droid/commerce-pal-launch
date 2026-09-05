import { Mail, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/** Local-only signup form: stores nothing remotely, gives clear feedback. */
export function Newsletter() {
  const [email, setEmail] = useState("");

  return (
    <section className="px-4 sm:px-0" aria-labelledby="newsletter">
      <div className="grid gap-5 rounded-3xl border bg-linear-to-br from-accent/80 to-surface p-6 shadow-card sm:p-9 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <h2 id="newsletter" className="text-lg font-extrabold tracking-tight sm:text-2xl">
            New drops and deals, first
          </h2>
          <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">
            Get notified when a new phone, tablet or audio deal lands in the store.
          </p>
        </div>

        <form
          className="flex w-full min-w-0 flex-col gap-2 sm:flex-row lg:w-auto"
          onSubmit={(event) => {
            event.preventDefault();
            if (!email.trim()) return;
            toast.success("You're on the list — we'll email you about new arrivals.", {
              position: "top-center",
            });
            setEmail("");
          }}
        >
          <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full border bg-background px-4 lg:w-72">
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="sr-only">Email address</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@email.com"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
          <button
            type="submit"
            className="press inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Subscribe
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </section>
  );
}
