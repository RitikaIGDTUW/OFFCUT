import { dbConnect } from "@/lib/db";
import { AuditLog } from "@/models/misc";
import { formatDateTime, plain } from "@/lib/utils";
import { PageHeader, Table } from "@/components/ui/primitives";

export const metadata = { title: "Audit log" };

const preview = (v: unknown) => {
  if (v === undefined || v === null) return "";
  const s = JSON.stringify(v);
  return s.length > 160 ? `${s.slice(0, 160)}…` : s;
};

export default async function AuditPage() {
  await dbConnect();
  const logs = plain(await AuditLog.find().sort({ createdAt: -1 }).limit(300).lean());
  return (
    <>
      <PageHeader eyebrow="Accountability" title={<>Audit <em>log</em></>}>
        Every admin mutation — who, what, before/after, when. Latest 300 entries.
      </PageHeader>
      <Table>
        <thead>
          <tr>
            <th>When</th>
            <th>Who</th>
            <th>Action</th>
            <th>Entity</th>
            <th>Before → after</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l._id}>
              <td className="whitespace-nowrap text-xs">{formatDateTime(l.createdAt)}</td>
              <td className="text-xs">{l.actorEmail}</td>
              <td className="font-mono text-xs">{l.action}</td>
              <td className="font-mono text-[11px]">
                {l.entity} {l.entityId ? `· ${l.entityId.slice(0, 40)}` : ""}
              </td>
              <td className="max-w-md">
                <details>
                  <summary className="cursor-pointer text-xs text-graphite">{preview(l.after) || preview(l.before) || "—"}</summary>
                  <pre className="mt-2 max-h-64 overflow-auto bg-paper-2 p-2 text-[10px]">{JSON.stringify({ before: l.before, after: l.after }, null, 2)}</pre>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
