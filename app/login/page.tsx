"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Wallet } from "lucide-react";

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) router.push("/");
  }, [user, loading, router]);

  if (loading) return null;
  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }
    const err = await login(username.trim(), password);
    if (err) {
      setError(err);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ width:"100%", maxWidth:380 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:56, height:56, borderRadius:16, background:"var(--accent-pale)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
            <Wallet size={28} color="var(--accent)" />
          </div>
          <h1 style={{ fontSize:28, fontWeight:800, margin:"0 0 4px" }}>SpendWise</h1>
          <p style={{ color:"var(--muted)", fontSize:14, margin:0 }}>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"var(--muted)", display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.06em" }}>Username</label>
            <input type="text" placeholder="your username" value={username} onChange={e=>setUsername(e.target.value)}
              style={{ background:"var(--surface)", color:"var(--text)", border:"1.5px solid var(--border)", borderRadius:12, padding:"12px 14px", width:"100%", fontSize:15, outline:"none" }} />
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"var(--muted)", display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.06em" }}>Password</label>
            <input type="password" placeholder="Enter your password" value={password} onChange={e=>setPassword(e.target.value)}
              style={{ background:"var(--surface)", color:"var(--text)", border:"1.5px solid var(--border)", borderRadius:12, padding:"12px 14px", width:"100%", fontSize:15, outline:"none" }} />
          </div>

          {error && <p style={{ color:"var(--danger)", fontSize:13, margin:0, textAlign:"center" }}>{error}</p>}

          <button type="submit" style={{ background:"linear-gradient(135deg, var(--accent), var(--accent-dark))", color:"white", border:"none", borderRadius:14, padding:"15px", fontWeight:700, fontSize:15, cursor:"pointer", boxShadow:"0 4px 16px rgba(21,145,220,0.3)", marginTop:4 }}>
            Sign In
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
