"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { LoaderCircle, Eye, EyeOff } from "lucide-react";
import { checkRateLimit, recordAttempt } from "@/lib/rate-limit";

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  useEffect(() => {
    if (!loading && user) router.push("/");
  }, [user, loading, router]);

  if (loading) return null;
  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const { allowed, cooldownMs } = checkRateLimit();
    if (!allowed) {
      const secs = Math.ceil(cooldownMs / 1000);
      setCooldown(secs);
      setError(`Too many attempts. Try again in ${secs}s`);
      return;
    }

    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }
    setSubmitting(true);
    const err = await login(username.trim(), password);
    if (err) {
      recordAttempt();
      setError(err);
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ width:"100%", maxWidth:380 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:56, height:56, borderRadius:16, background:"var(--accent-pale)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
            <img src="/spendwise.png" alt="SpendWise" style={{ width:28, height:28, objectFit:"contain" }} />
          </div>
          <h1 style={{ fontSize:28, fontWeight:800, margin:"0 0 4px" }}>SpendWise</h1>
          <p style={{ color:"var(--muted)", fontSize:14, margin:0 }}>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"var(--muted)", display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.06em" }}>Username</label>
            <input type="text" placeholder="Enter username" value={username} onChange={e=>setUsername(e.target.value)}
              style={{ background:"var(--surface)", color:"var(--text)", border:"1.5px solid var(--border)", borderRadius:12, padding:"12px 14px", width:"100%", fontSize:15, outline:"none" }} />
          </div>
          <div style={{ position:"relative" }}>
            <label style={{ fontSize:11, fontWeight:700, color:"var(--muted)", display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.06em" }}>Password</label>
            <input type={showPassword?"text":"password"} placeholder="Enter your password" value={password} onChange={e=>setPassword(e.target.value)}
              style={{ background:"var(--surface)", color:"var(--text)", border:"1.5px solid var(--border)", borderRadius:12, padding:"12px 14px", width:"100%", fontSize:15, outline:"none", paddingRight:40 }} />
            {password && (
              <button type="button" onClick={()=>setShowPassword(!showPassword)}
                style={{ position:"absolute", right:10, bottom:10, background:"none", border:"none", cursor:"pointer", color:"var(--muted)", padding:4, display:"flex" }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            )}
          </div>

          {error && <p style={{ color:"var(--danger)", fontSize:13, margin:0, textAlign:"center" }}>{error}</p>}

          <button type="submit" disabled={submitting || cooldown > 0} className="btn-primary" style={{ marginTop:4 }}>
            {submitting ? <LoaderCircle className="spin" size={18} /> : null}
            {submitting ? "Signing in…" : cooldown > 0 ? `Wait ${cooldown}s` : "Sign In"}
          </button>
        </form>

        <p style={{ textAlign:"center", color:"var(--muted)", fontSize:13, marginTop:20 }}>
          Don&apos;t have an account?{" "}
          <button onClick={()=>router.push("/signup")} style={{ background:"none", border:"none", color:"var(--accent)", fontWeight:700, cursor:"pointer", fontSize:13, padding:0 }}>
            Create one
          </button>
        </p>
      </div>
    </div>
  );
}
