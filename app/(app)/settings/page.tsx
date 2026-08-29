"use client";
// Admin-only member management (brief C2). Non-admins see a read-only list.
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [members, setMembers] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "ANALYST" });
  const [error, setError] = useState("");

  function load() {
    fetch("/api/members").then((r) => r.json()).then(setMembers);
  }
  useEffect(load, []);

  async function removeMember(id: string, name: string) {
    if (!confirm(`Remove ${name} from this workspace? This cannot be undone.`)) return;
    const res = await fetch(`/api/members?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Could not remove member");
      return;
    }
    load();
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      // Server errors are either a plain string (e.g. "Email already in use")
      // or a Zod validation object (e.g. password too short). Handle both so
      // we always end up with a readable string, never an object.
      if (typeof data.error === "string") {
        setError(data.error);
      } else if (data.error?.fieldErrors) {
        const firstFieldError = Object.values(data.error.fieldErrors).flat()[0];
        setError(typeof firstFieldError === "string" ? firstFieldError : "Please check the form fields");
      } else {
        setError("Could not add member");
      }
      return;
    }
    setForm({ name: "", email: "", password: "", role: "ANALYST" });
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings — Members</h1>

      <div className="bg-white border rounded-xl divide-y">
        {members.map((m) => (
          <div key={m.id} className="p-4 flex justify-between items-center text-sm">
            <div>
              <div className="font-medium">{m.name}</div>
              <div className="text-gray-400 text-xs">{m.email}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs bg-gray-100 px-2 py-1 rounded h-fit">{m.role}</span>
              {isAdmin && m.id !== session?.user?.id && (
                <button onClick={() => removeMember(m.id, m.name)} className="text-xs text-red-600 hover:underline">
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {isAdmin && (
        <div className="bg-white border rounded-xl p-4">
          <h2 className="font-semibold text-sm mb-3">Add a teammate</h2>
          <form onSubmit={invite} className="grid grid-cols-2 gap-3">
            <input placeholder="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Temporary password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
              <option value="ADMIN">Admin</option>
              <option value="ANALYST">Analyst</option>
              <option value="VIEWER">Viewer</option>
            </select>
            <button className="col-span-2 bg-brand text-white rounded-lg py-2 text-sm font-medium">Add member</button>
          </form>
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        </div>
      )}
    </div>
  );
}
