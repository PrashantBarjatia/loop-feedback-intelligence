"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", workspaceName: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error?.formErrors?.[0] ?? data.error ?? "Sign up failed");
      setLoading(false);
      return;
    }
    await signIn("credentials", { email: form.email, password: form.password, redirect: false });
    setLoading(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-dark via-indigo-950 to-brand-dark px-4">
      <div className="bg-gradient-to-b from-indigo-900/60 to-indigo-950/60 border border-indigo-500/30 backdrop-blur rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand to-indigo-400 flex items-center justify-center text-2xl shadow-lg mb-4">
            🔁
          </div>
          <h1 className="text-2xl font-bold text-white">Create your workspace</h1>
          <p className="text-indigo-200/70 text-sm mt-1">You'll be the admin of this workspace.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { key: "workspaceName", label: "Company / Workspace Name", type: "text", placeholder: "Acme Inc" },
            { key: "name", label: "Your Name", type: "text", placeholder: "Jane Doe" },
            { key: "email", label: "Email Address", type: "email", placeholder: "you@company.com" },
            { key: "password", label: "Password", type: "password", placeholder: "••••••••" },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-medium mb-1 text-indigo-200/80">{f.label}</label>
              <div className="relative">
                <input
                  type={f.key === "password" ? (showPassword ? "text" : "password") : f.type} required
                  placeholder={f.placeholder}
                  value={(form as any)[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 pr-10 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand"
                />
                {f.key === "password" && (
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                    tabIndex={-1}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                )}
              </div>
            </div>
          ))}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-brand to-indigo-400 text-white rounded-lg py-2.5 font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Workspace →"}
          </button>
        </form>

        <p className="text-sm text-indigo-200/60 mt-5 text-center">
          Already have an account? <Link href="/login" className="text-white font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}