/**
 * Character-level diff between a student's typed answer and the closest
 * accepted answer. Compares case-insensitively; renders the original text.
 * Wrong/extra characters in the student's answer are red; characters they
 * missed are shown in the key line in green.
 */
type Op = { ch: string; kind: "same" | "del" | "ins" };

function lcsDiff(a: string[], b: string[]): Op[] {
  const n = a.length,
    m = b.length;
  const eq = (x: string, y: string) => x.toLowerCase() === y.toLowerCase();
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0),
  );
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = eq(a[i], b[j])
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ops: Op[] = [];
  let i = 0,
    j = 0;
  while (i < n && j < m) {
    if (eq(a[i], b[j])) {
      ops.push({ ch: a[i], kind: "same" });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ ch: a[i], kind: "del" });
      i++;
    } else {
      ops.push({ ch: b[j], kind: "ins" });
      j++;
    }
  }
  while (i < n) ops.push({ ch: a[i++], kind: "del" });
  while (j < m) ops.push({ ch: b[j++], kind: "ins" });
  return ops;
}

const clean = (s: string) => s.normalize("NFC").trim().replace(/\s+/g, " ");

export function AnswerDiff({
  answer,
  expected,
}: {
  answer: string;
  expected: string;
}) {
  const a = [...clean(answer)];
  const b = [...clean(expected)];
  if (a.length > 300 || b.length > 300) {
    return <span>{answer}</span>;
  }
  const ops = lcsDiff(a, b);
  const identical = ops.every((o) => o.kind === "same");

  return (
    <span className="inline-grid gap-0.5 font-mono text-sm">
      <span>
        <span className="mr-2 text-xs text-ink-2">คุณตอบ</span>
        {ops
          .filter((o) => o.kind !== "ins")
          .map((o, k) => (
            <span
              key={k}
              className={
                o.kind === "del"
                  ? "rounded-sm bg-danger-soft font-semibold text-danger line-through"
                  : ""
              }
            >
              {o.ch}
            </span>
          ))}
      </span>
      {!identical && (
        <span>
          <span className="mr-2 text-xs text-ink-2">เฉลย</span>
          {ops
            .filter((o) => o.kind !== "del")
            .map((o, k) => (
              <span
                key={k}
                className={
                  o.kind === "ins"
                    ? "rounded-sm bg-mint-soft font-semibold text-mint underline"
                    : ""
                }
              >
                {o.ch}
              </span>
            ))}
        </span>
      )}
    </span>
  );
}
