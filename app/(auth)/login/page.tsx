"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Quick-login presets for the demo accounts created by prisma/seed.ts.
// Clicking one fills the form and submits immediately — handy for demos
// and for your mentor call so you don't have to type credentials live.
const DEMO_ACCOUNTS = [
  { role: "Admin", tagline: "Full control", email: "admin@acme.demo" },
  { role: "Analyst", tagline: "Ingest & AI", email: "analyst@acme.demo" },
  { role: "Viewer", tagline: "Read-only", email: "viewer@acme.demo" },
];
const DEMO_PASSWORD = "Password123!";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function doSignIn(emailToUse: string, passwordToUse: string) {
    setError("");
    setLoading(true);
    const res = await signIn("credentials", { email: emailToUse, password: passwordToUse, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    doSignIn(email, password);
  }

  function handleDemoClick(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    doSignIn(demoEmail, DEMO_PASSWORD);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-dark via-indigo-950 to-brand-dark px-4">
      <div className="bg-gradient-to-b from-indigo-900/60 to-indigo-950/60 border border-indigo-500/30 backdrop-blur rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand to-indigo-400 flex items-center justify-center text-2xl shadow-lg mb-4">
            🔁
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome to Project LOOP</h1>
          <p className="text-indigo-200/70 text-sm mt-1">AI Customer-Feedback Intelligence Platform</p>
        </div>

        <p className="text-center text-xs font-semibold tracking-wide text-indigo-300/80 mb-3">
          DEMO CREDENTIALS — 1-CLICK ROLE ACCESS
        </p>
        <div className="grid grid-cols-3 gap-2 mb-6">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              disabled={loading}
              onClick={() => handleDemoClick(acc.email)}
              className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition px-2 py-3 text-center disabled:opacity-50"
            >
              <div className="text-white text-sm font-semibold">{acc.role}</div>
              <div className="text-indigo-300/60 text-[10px] mt-0.5">{acc.tagline}</div>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[10px] tracking-wide text-indigo-300/60">OR MANUAL LOGIN</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1 text-indigo-200/80">Email Address</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@acme.com"
              className="w-full rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-indigo-200/80">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg px-3 py-2 pr-10 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                tabIndex={-1}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-brand to-indigo-400 text-white rounded-lg py-2.5 font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In to Workspace →"}
          </button>
        </form>

        <p className="text-sm text-indigo-200/60 mt-5 text-center">
          No account? <Link href="/signup" className="text-white font-medium hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  );
}