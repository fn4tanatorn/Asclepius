import { alert } from "@/components/ui";

/** Renders ?ok= / ?error= messages produced by server actions. */
export function Flash({
  ok,
  error,
}: {
  ok?: string | string[];
  error?: string | string[];
}) {
  const okMsg = typeof ok === "string" ? ok : null;
  const errMsg = typeof error === "string" ? error : null;
  if (!okMsg && !errMsg) return null;
  return (
    <p
      role={errMsg ? "alert" : "status"}
      className={errMsg ? alert.error : alert.ok}
    >
      {errMsg ?? okMsg}
    </p>
  );
}
