/** Renders ?ok= / ?error= messages produced by server actions. */
export function Flash({ ok, error }: { ok?: string | string[]; error?: string | string[] }) {
  const okMsg = typeof ok === "string" ? ok : null;
  const errMsg = typeof error === "string" ? error : null;
  if (!okMsg && !errMsg) return null;
  return (
    <p
      role={errMsg ? "alert" : "status"}
      className={
        errMsg
          ? "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          : "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
      }
    >
      {errMsg ?? okMsg}
    </p>
  );
}
