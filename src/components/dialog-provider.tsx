"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Modal } from "@/components/modal";

type ConfirmOptions = {
  title?: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};

type PromptOptions = {
  title?: string;
  message?: ReactNode;
  label?: string;
  placeholder?: string;
  confirmText?: string;
  danger?: boolean;
};

type AlertOptions = { title?: string; message: ReactNode };

type DialogApi = {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
  alert: (options: AlertOptions | string) => Promise<void>;
};

type State =
  | { kind: "confirm"; options: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: "prompt"; options: PromptOptions; resolve: (v: string | null) => void }
  | { kind: "alert"; options: AlertOptions; resolve: () => void };

const DialogContext = createContext<DialogApi | null>(null);

export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog phải nằm trong DialogProvider");
  return ctx;
}

/** Thay thế window.confirm/prompt/alert bằng hộp thoại theo giao diện hệ thống. */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State | null>(null);
  const [value, setValue] = useState("");
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const open = useCallback(<T,>(build: (resolve: (v: T) => void) => State) => {
    const run = () =>
      new Promise<T>((resolve) => {
        setValue("");
        setState(build(resolve));
      });
    const next = queue.current.then(run, run);
    queue.current = next;
    return next;
  }, []);

  const api = useMemo<DialogApi>(
    () => ({
      confirm: (o) => {
        const options = typeof o === "string" ? { message: o } : o;
        return open<boolean>((resolve) => ({ kind: "confirm", options, resolve }));
      },
      prompt: (options) => open<string | null>((resolve) => ({ kind: "prompt", options, resolve })),
      alert: (o) => {
        const options = typeof o === "string" ? { message: o } : o;
        return open<void>((resolve) => ({ kind: "alert", options, resolve }));
      },
    }),
    [open],
  );

  const close = (result?: boolean | string | null) => {
    if (!state) return;
    if (state.kind === "confirm") state.resolve(result === true);
    else if (state.kind === "prompt") state.resolve(typeof result === "string" ? result : null);
    else state.resolve();
    setState(null);
  };

  const danger = state && state.kind !== "alert" ? Boolean(state.options.danger) : false;
  const title =
    state?.options.title ??
    (state?.kind === "alert" ? "Thông báo" : state?.kind === "prompt" ? "Nhập thông tin" : "Xác nhận");
  const canSubmit = state?.kind !== "prompt" || value.trim().length > 0;

  return (
    <DialogContext.Provider value={api}>
      {children}
      <Modal isOpen={state !== null} onClose={() => close(null)} zIndex="z-[200]">
        {state && (
          <form
            role="alertdialog"
            aria-labelledby="app-dialog-title"
            className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 text-left shadow-2xl"
            onSubmit={(e) => {
              e.preventDefault();
              if (!canSubmit) return;
              close(state.kind === "prompt" ? value.trim() : true);
            }}
          >
            <h3 id="app-dialog-title" className="text-lg font-semibold text-fg">
              {title}
            </h3>
            {state.options.message && (
              <div className="mt-2 text-sm text-fg-muted">{state.options.message}</div>
            )}
            {state.kind === "prompt" && (
              <div className="mt-4">
                {state.options.label && (
                  <label htmlFor="app-dialog-input" className="block text-sm font-medium text-fg">
                    {state.options.label}
                  </label>
                )}
                <textarea
                  id="app-dialog-input"
                  autoFocus
                  rows={3}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={state.options.placeholder}
                  className="mt-1.5 w-full resize-y rounded-lg border border-line bg-muted px-3 py-2.5 text-sm text-fg outline-none focus:border-primary focus:bg-surface focus:ring-[3px] focus:ring-primary-soft"
                />
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              {state.kind !== "alert" && (
                <button
                  type="button"
                  onClick={() => close(null)}
                  className="rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-medium text-fg hover:bg-muted"
                >
                  {state.kind === "confirm" ? (state.options.cancelText ?? "Hủy") : "Hủy"}
                </button>
              )}
              <button
                type="submit"
                autoFocus={state.kind !== "prompt"}
                disabled={!canSubmit}
                className={`rounded-lg px-3.5 py-2 text-sm font-semibold hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${
                  danger ? "bg-bad text-white" : "bg-primary text-primary-fg"
                }`}
              >
                {state.kind === "alert" ? "Đóng" : (state.options.confirmText ?? "Xác nhận")}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </DialogContext.Provider>
  );
}
