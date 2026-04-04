"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  ArrowRight,
  Zap,
  BarChart3,
  Users,
  Globe,
  ChevronRight,
  Clock,
  CheckCircle2,
  Lock,
  Eye,
  Loader2,
  MessageCircle,
} from "lucide-react";

interface ActiveElection {
  id: string;
  title: string;
  slug: string;
  department: string | null;
  end_time: string;
  status: string;
  candidate_count: number;
  voter_count: number;
}

export default function LandingPage() {
  const router = useRouter();
  const [elections, setElections] = useState<ActiveElection[]>([]);
  const [loadingElections, setLoadingElections] = useState(false);
  const [showElections, setShowElections] = useState(false);
  const [mounted, setMounted] = useState(false);
  const electionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
  }, []);

  async function handleVoteNow() {
    setShowElections(true);
    setLoadingElections(true);
    try {
      const res = await fetch("/api/elections/active");
      if (res.ok) {
        const data = await res.json();
        setElections(data.elections || []);
      }
    } catch {
    } finally {
      setLoadingElections(false);
      setTimeout(() => {
        electionsRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }

  function getTimeLeft(endTime: string) {
    const diff = Math.max(0, new Date(endTime).getTime() - Date.now());
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h left`;
    if (hours > 0) return `${hours}h ${mins}m left`;
    return `${mins}m left`;
  }

  function openWhatsApp() {
    const message = encodeURIComponent(
      "Hello OSEM Technologies, I need support with OSEM Secure Vote.",
    );
    window.open(`https://wa.me/233256364076?text=${message}`, "_blank");
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "#000913",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,900;1,9..40,300&family=DM+Serif+Display:ital@0;1&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes rotate-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes breathe-btn {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 8px 32px rgba(249,168,37,0.3);
          }
          50% {
            transform: scale(1.04);
            box-shadow: 0 20px 60px rgba(249,168,37,0.6);
          }
        }
        @keyframes breathe-glow {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(1.1); }
        }
        @keyframes whatsapp-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-6px) scale(1.05); }
        }

        .fade-up-1 { animation: fadeUp 0.8s ease forwards; }
        .fade-up-2 { animation: fadeUp 0.8s ease 0.15s forwards; opacity: 0; }
        .fade-up-3 { animation: fadeUp 0.8s ease 0.3s forwards; opacity: 0; }
        .fade-up-4 { animation: fadeUp 0.8s ease 0.45s forwards; opacity: 0; }
        .fade-up-5 { animation: fadeUp 0.8s ease 0.6s forwards; opacity: 0; }

        .shimmer-text {
          background: linear-gradient(90deg, #F9A825 0%, #FFD54F 30%, #F9A825 60%, #E65100 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }

        .hero-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }

        .card-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card-hover:hover {
          transform: translateY(-4px);
          border-color: rgba(249,168,37,0.4) !important;
          background: rgba(249,168,37,0.06) !important;
        }

        .feature-icon {
          transition: all 0.3s ease;
        }
        .feature-card:hover .feature-icon {
          transform: scale(1.1) rotate(-5deg);
        }

        .election-card {
          transition: all 0.25s ease;
          cursor: pointer;
        }
        .election-card:hover {
          transform: translateX(6px);
          border-color: rgba(249,168,37,0.5) !important;
          background: rgba(249,168,37,0.08) !important;
        }

        .grid-bg {
          background-image:
            linear-gradient(rgba(249,168,37,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(249,168,37,0.03) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        .whatsapp-btn {
          animation: whatsapp-bounce 3s ease-in-out infinite;
          transition: all 0.2s ease;
        }
        .whatsapp-btn:hover {
          animation: none;
          transform: scale(1.1);
          box-shadow: 0 12px 40px rgba(37,211,102,0.5) !important;
        }
      `}</style>

      {/* Background effects */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <div
          className="hero-glow"
          style={{
            width: "600px",
            height: "600px",
            background:
              "radial-gradient(circle, rgba(249,168,37,0.08) 0%, transparent 70%)",
            top: "-200px",
            left: "-100px",
            animation: "glow-pulse 4s ease infinite",
          }}
        />
        <div
          className="hero-glow"
          style={{
            width: "400px",
            height: "400px",
            background:
              "radial-gradient(circle, rgba(249,168,37,0.06) 0%, transparent 70%)",
            bottom: "10%",
            right: "-100px",
            animation: "glow-pulse 4s ease 2s infinite",
          }}
        />
      </div>

      {/* Grid background */}
      <div
        className="grid-bg"
        style={{ position: "fixed", inset: 0, zIndex: 0, opacity: 0.5 }}
      />

      {/* WhatsApp floating support button */}
      <button
        onClick={openWhatsApp}
        className="whatsapp-btn"
        style={{
          position: "fixed",
          bottom: "28px",
          right: "28px",
          zIndex: 100,
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #25D366, #128C7E)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 32px rgba(37,211,102,0.35)",
        }}
        title="WhatsApp Support"
      >
        <MessageCircle size={26} color="#ffffff" fill="#ffffff" />
      </button>

      {/* Support label — shows on hover via CSS would need JS, so just show tooltip */}
      <div
        style={{
          position: "fixed",
          bottom: "96px",
          right: "28px",
          zIndex: 100,
          padding: "6px 14px",
          borderRadius: "20px",
          background: "rgba(0,0,0,0.8)",
          border: "1px solid rgba(37,211,102,0.3)",
          backdropFilter: "blur(10px)",
          animation: "fadeIn 1s ease 2s forwards",
          opacity: 0,
          pointerEvents: "none",
        }}
      >
        <p
          style={{
            fontSize: "11px",
            color: "#25D366",
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          💬 Support — Quick Response
        </p>
      </div>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Nav — no Vote Now button */}
        <nav
          style={{
            padding: "20px 40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            backdropFilter: "blur(20px)",
            position: "sticky",
            top: 0,
            zIndex: 50,
            background: "rgba(0,9,19,0.85)",
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                background: "linear-gradient(135deg, #F9A825, #E65100)",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 20px rgba(249,168,37,0.3)",
              }}
            >
              <ShieldCheck size={18} color="#000913" strokeWidth={2.5} />
            </div>
            <span
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: "16px",
                color: "#ffffff",
                fontWeight: 400,
                letterSpacing: "-0.3px",
              }}
            >
              OSEM <span style={{ color: "#F9A825" }}>Secure Vote</span>
            </span>
          </div>

          {/* Right side — live indicator only */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "20px",
              background: "rgba(22,163,74,0.12)",
              border: "1px solid rgba(22,163,74,0.25)",
            }}
          >
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#4ADE80",
                boxShadow: "0 0 8px #4ADE80",
                animation: "glow-pulse 2s ease infinite",
              }}
            />
            <span
              style={{ fontSize: "11px", color: "#4ADE80", fontWeight: 600 }}
            >
              System Live
            </span>
          </div>
        </nav>

        {/* Hero */}
        <section
          style={{
            minHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 24px",
            textAlign: "center",
          }}
        >
          {/* Badge */}
          <div
            className="fade-up-1"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 20px",
              borderRadius: "40px",
              background: "rgba(249,168,37,0.08)",
              border: "1px solid rgba(249,168,37,0.25)",
              marginBottom: "32px",
            }}
          >
            <Zap size={12} color="#F9A825" />
            <span
              style={{
                fontSize: "12px",
                color: "#F9A825",
                fontWeight: 600,
                letterSpacing: "0.5px",
              }}
            >
              TRUSTED DIGITAL VOTING PLATFORM
            </span>
          </div>

          {/* Headline */}
          <h1
            className="fade-up-2"
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: "clamp(48px, 8vw, 88px)",
              lineHeight: 1.05,
              marginBottom: "24px",
              maxWidth: "900px",
            }}
          >
            <span style={{ color: "#ffffff" }}>Run Honest</span>
            <br />
            <span className="shimmer-text">Elections.</span>
            <br />
            <span style={{ color: "#ffffff", fontStyle: "italic" }}>
              Anywhere.
            </span>
          </h1>

          {/* Subheading */}
          <p
            className="fade-up-3"
            style={{
              fontSize: "clamp(16px, 2vw, 20px)",
              color: "rgba(255,255,255,0.5)",
              maxWidth: "560px",
              lineHeight: 1.6,
              marginBottom: "56px",
              fontWeight: 300,
            }}
          >
            From student unions to corporate boards — OSEM Secure Vote delivers
            end-to-end encrypted, real-time elections that organizations trust.
          </p>

          {/* Single breathing Vote Now button */}
          <div
            className="fade-up-4"
            style={{ display: "flex", justifyContent: "center" }}
          >
            <button
              onClick={handleVoteNow}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "22px 60px",
                background: "linear-gradient(135deg, #F9A825, #E65100)",
                border: "none",
                borderRadius: "20px",
                color: "#000913",
                fontSize: "19px",
                fontWeight: 800,
                cursor: "pointer",
                letterSpacing: "-0.3px",
                animation: "breathe-btn 3s ease-in-out infinite",
                position: "relative",
              }}
            >
              {/* Glow ring */}
              <span
                style={{
                  position: "absolute",
                  inset: "-6px",
                  borderRadius: "26px",
                  background: "linear-gradient(135deg, #F9A825, #E65100)",
                  opacity: 0.3,
                  filter: "blur(16px)",
                  animation: "breathe-glow 3s ease-in-out infinite",
                  zIndex: -1,
                }}
              />
              <Globe size={22} />
              Vote Now
              <ArrowRight size={22} />
            </button>
          </div>

          {/* Trust indicators */}
          <div
            className="fade-up-5"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "32px",
              marginTop: "56px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {[
              { icon: Lock, label: "End-to-end encrypted" },
              { icon: CheckCircle2, label: "One person, one vote" },
              { icon: Eye, label: "Real-time results" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <Icon size={14} color="#F9A825" />
                <span
                  style={{
                    fontSize: "13px",
                    color: "rgba(255,255,255,0.5)",
                    fontWeight: 500,
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section
          style={{
            padding: "0 24px 100px",
            maxWidth: "1100px",
            margin: "0 auto",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
            }}
          >
            {[
              {
                value: "100%",
                label: "Vote integrity",
                sub: "Cryptographically verified",
              },
              {
                value: "< 1s",
                label: "Vote submission",
                sub: "Real-time processing",
              },
              {
                value: "0",
                label: "Double votes",
                sub: "Mathematically impossible",
              },
              {
                value: "24/7",
                label: "Monitoring",
                sub: "Live control room display",
              },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="card-hover"
                style={{
                  padding: "32px 24px",
                  borderRadius: "20px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  textAlign: "center",
                  animation: `fadeUp 0.6s ease ${0.1 * i}s forwards`,
                  opacity: 0,
                }}
              >
                <p
                  style={{
                    fontFamily: "'DM Serif Display', serif",
                    fontSize: "48px",
                    color: "#F9A825",
                    lineHeight: 1,
                    marginBottom: "8px",
                  }}
                >
                  {stat.value}
                </p>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#ffffff",
                    fontWeight: 600,
                    marginBottom: "4px",
                  }}
                >
                  {stat.label}
                </p>
                <p
                  style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)" }}
                >
                  {stat.sub}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section
          style={{
            padding: "100px 24px",
            maxWidth: "1100px",
            margin: "0 auto",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <p
              style={{
                fontSize: "12px",
                color: "#F9A825",
                fontWeight: 700,
                letterSpacing: "3px",
                marginBottom: "16px",
              }}
            >
              WHY OSEM SECURE VOTE
            </p>
            <h2
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: "clamp(32px, 5vw, 52px)",
                color: "#ffffff",
                lineHeight: 1.1,
              }}
            >
              Built for organizations that
              <br />
              <span className="shimmer-text">can not afford mistakes.</span>
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "20px",
            }}
          >
            {[
              {
                icon: ShieldCheck,
                title: "Google OAuth Verified",
                desc: "Every voter verified through their organization's Google account. No fake accounts. No proxy votes.",
                color: "#4ADE80",
              },
              {
                icon: Lock,
                title: "Cryptographic Integrity",
                desc: "Votes are hashed and stored immutably. Every ballot is auditable. Tampering is mathematically impossible.",
                color: "#60A5FA",
              },
              {
                icon: BarChart3,
                title: "Live Control Room",
                desc: "Project real-time turnout and provisional results on a wall screen. Built for election day drama.",
                color: "#F9A825",
              },
              {
                icon: Users,
                title: "Any Organization",
                desc: "Student unions, NGOs, churches, corporate boards, professional associations — if you vote, we secure it.",
                color: "#A78BFA",
              },
              {
                icon: Zap,
                title: "Instant Results",
                desc: "Results computed in real time. Publish with one click. Students see winners seconds after polls close.",
                color: "#FB923C",
              },
              {
                icon: Eye,
                title: "Full Audit Trail",
                desc: "Every action logged with timestamps. Complete audit trail for dispute resolution and transparency.",
                color: "#F87171",
              },
            ].map((feature, i) => (
              <div
                key={feature.title}
                className="card-hover feature-card"
                style={{
                  padding: "32px",
                  borderRadius: "20px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  animation: `fadeUp 0.6s ease ${0.1 * i}s forwards`,
                  opacity: 0,
                }}
              >
                <div
                  className="feature-icon"
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "14px",
                    background: `${feature.color}18`,
                    border: `1px solid ${feature.color}30`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "20px",
                  }}
                >
                  <feature.icon size={22} color={feature.color} />
                </div>
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#ffffff",
                    marginBottom: "10px",
                  }}
                >
                  {feature.title}
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "rgba(255,255,255,0.45)",
                    lineHeight: 1.6,
                    fontWeight: 300,
                  }}
                >
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section
          style={{
            padding: "100px 24px",
            background: "rgba(249,168,37,0.03)",
            borderTop: "1px solid rgba(249,168,37,0.1)",
            borderBottom: "1px solid rgba(249,168,37,0.1)",
          }}
        >
          <div
            style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}
          >
            <p
              style={{
                fontSize: "12px",
                color: "#F9A825",
                fontWeight: 700,
                letterSpacing: "3px",
                marginBottom: "16px",
              }}
            >
              HOW IT WORKS
            </p>
            <h2
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: "clamp(28px, 4vw, 44px)",
                color: "#ffffff",
                marginBottom: "64px",
              }}
            >
              Three steps to a secure election
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "32px",
              }}
            >
              {[
                {
                  step: "01",
                  title: "Find your election",
                  desc: "Click 'Vote Now', see all active elections and select yours.",
                },
                {
                  step: "02",
                  title: "Verify with Google",
                  desc: "Sign in with your organization's Google account. Verified instantly.",
                },
                {
                  step: "03",
                  title: "Cast your vote",
                  desc: "Select your candidates, review your ballot, and submit. Done in 60 seconds.",
                },
              ].map((step, i) => (
                <div
                  key={step.step}
                  style={{
                    textAlign: "center",
                    animation: `fadeUp 0.6s ease ${0.2 * i}s forwards`,
                    opacity: 0,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'DM Serif Display', serif",
                      fontSize: "64px",
                      color: "rgba(249,168,37,0.2)",
                      lineHeight: 1,
                      marginBottom: "16px",
                    }}
                  >
                    {step.step}
                  </div>
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: 700,
                      color: "#ffffff",
                      marginBottom: "10px",
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "14px",
                      color: "rgba(255,255,255,0.4)",
                      lineHeight: 1.6,
                      fontWeight: 300,
                    }}
                  >
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Active Elections section */}
        <section
          ref={electionsRef}
          style={{
            padding: "100px 24px",
            maxWidth: "800px",
            margin: "0 auto",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <p
              style={{
                fontSize: "12px",
                color: "#F9A825",
                fontWeight: 700,
                letterSpacing: "3px",
                marginBottom: "16px",
              }}
            >
              VOTE NOW
            </p>
            <h2
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: "clamp(28px, 4vw, 44px)",
                color: "#ffffff",
                marginBottom: "16px",
              }}
            >
              Active Elections
            </h2>
            <p
              style={{
                fontSize: "15px",
                color: "rgba(255,255,255,0.4)",
                fontWeight: 300,
              }}
            >
              Select your election below to cast your vote
            </p>
          </div>

          {!showElections ? (
            <div style={{ textAlign: "center" }}>
              <button
                onClick={handleVoteNow}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "20px 48px",
                  background: "linear-gradient(135deg, #F9A825, #E65100)",
                  border: "none",
                  borderRadius: "16px",
                  color: "#000913",
                  fontSize: "17px",
                  fontWeight: 700,
                  cursor: "pointer",
                  animation: "breathe-btn 3s ease-in-out infinite",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    inset: "-6px",
                    borderRadius: "22px",
                    background: "linear-gradient(135deg, #F9A825, #E65100)",
                    opacity: 0.25,
                    filter: "blur(14px)",
                    animation: "breathe-glow 3s ease-in-out infinite",
                    zIndex: -1,
                  }}
                />
                <Globe size={20} />
                Show Active Elections
                <ArrowRight size={20} />
              </button>
            </div>
          ) : loadingElections ? (
            <div style={{ textAlign: "center", padding: "60px" }}>
              <Loader2
                size={32}
                color="#F9A825"
                style={{
                  animation: "rotate-slow 1s linear infinite",
                  margin: "0 auto",
                }}
              />
              <p
                style={{
                  color: "rgba(255,255,255,0.4)",
                  marginTop: "16px",
                  fontSize: "14px",
                }}
              >
                Loading active elections...
              </p>
            </div>
          ) : elections.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px",
                borderRadius: "24px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "20px",
                  background: "rgba(249,168,37,0.1)",
                  border: "1px solid rgba(249,168,37,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                }}
              >
                <Globe size={28} color="#F9A825" />
              </div>
              <h3
                style={{
                  color: "#ffffff",
                  fontSize: "18px",
                  fontWeight: 700,
                  marginBottom: "8px",
                }}
              >
                No Active Elections
              </h3>
              <p
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: "14px",
                  lineHeight: 1.6,
                }}
              >
                There are no elections currently open for voting. Check back on
                election day or contact your organization.
              </p>
              <button
                onClick={openWhatsApp}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  marginTop: "24px",
                  padding: "12px 24px",
                  background: "rgba(37,211,102,0.15)",
                  border: "1px solid rgba(37,211,102,0.3)",
                  borderRadius: "12px",
                  color: "#25D366",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <MessageCircle size={15} />
                Contact Support on WhatsApp
              </button>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {elections.map((election, i) => (
                <div
                  key={election.id}
                  className="election-card"
                  onClick={() =>
                    router.push(`/election/${election.slug}/login`)
                  }
                  style={{
                    padding: "24px 28px",
                    borderRadius: "20px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    display: "flex",
                    alignItems: "center",
                    gap: "20px",
                    animation: `fadeUp 0.4s ease ${0.1 * i}s forwards`,
                    opacity: 0,
                  }}
                >
                  {/* Live dot */}
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      background: "#4ADE80",
                      boxShadow: "0 0 12px #4ADE80",
                      flexShrink: 0,
                      animation: "glow-pulse 2s ease infinite",
                    }}
                  />

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: "16px",
                        fontWeight: 700,
                        color: "#ffffff",
                        marginBottom: "4px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {election.title}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        flexWrap: "wrap",
                      }}
                    >
                      {election.department && (
                        <span
                          style={{
                            fontSize: "12px",
                            color: "rgba(255,255,255,0.4)",
                          }}
                        >
                          {election.department}
                        </span>
                      )}
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "12px",
                          color: "#F9A825",
                          fontWeight: 500,
                        }}
                      >
                        <Clock size={11} />
                        {getTimeLeft(election.end_time)}
                      </span>
                    </div>
                  </div>

                  {/* Vote button */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 20px",
                      borderRadius: "12px",
                      background: "rgba(249,168,37,0.12)",
                      border: "1px solid rgba(249,168,37,0.25)",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#F9A825",
                        fontWeight: 700,
                      }}
                    >
                      Vote
                    </span>
                    <ChevronRight size={14} color="#F9A825" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* CTA Banner */}
        <section
          style={{
            padding: "80px 24px",
            textAlign: "center",
            background:
              "linear-gradient(135deg, rgba(249,168,37,0.08), rgba(230,81,0,0.08))",
            borderTop: "1px solid rgba(249,168,37,0.15)",
            borderBottom: "1px solid rgba(249,168,37,0.15)",
          }}
        >
          <h2
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: "clamp(28px, 4vw, 48px)",
              color: "#ffffff",
              marginBottom: "16px",
            }}
          >
            Ready to run your election?
          </h2>
          <p
            style={{
              fontSize: "16px",
              color: "rgba(255,255,255,0.4)",
              marginBottom: "40px",
              fontWeight: 300,
            }}
          >
            Contact OSEM Technologies to get your organization set up.
          </p>
          <div
            style={{
              display: "flex",
              gap: "16px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() =>
                (window.location.href = "mailto:emmanueloseisimpe5@gmail.com")
              }
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                padding: "18px 40px",
                background: "linear-gradient(135deg, #F9A825, #E65100)",
                border: "none",
                borderRadius: "16px",
                color: "#000913",
                fontSize: "16px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 8px 32px rgba(249,168,37,0.25)",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "translateY(-2px)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "translateY(0)")
              }
            >
              Get Started
              <ArrowRight size={18} />
            </button>
            <button
              onClick={openWhatsApp}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                padding: "18px 40px",
                background: "rgba(37,211,102,0.12)",
                border: "1px solid rgba(37,211,102,0.3)",
                borderRadius: "16px",
                color: "#25D366",
                fontSize: "16px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "translateY(-2px)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "translateY(0)")
              }
            >
              <MessageCircle size={18} />
              WhatsApp Us
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer
          style={{
            padding: "40px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
            maxWidth: "1100px",
            margin: "0 auto",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                background: "linear-gradient(135deg, #F9A825, #E65100)",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShieldCheck size={14} color="#000913" />
            </div>
            <span
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: "14px",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              OSEM <span style={{ color: "#F9A825" }}>Technologies</span>
            </span>
          </div>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)" }}>
            © {new Date().getFullYear()} OSEM Technologies. All rights reserved.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              onClick={openWhatsApp}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.3)",
                fontSize: "12px",
                cursor: "pointer",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#25D366")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "rgba(255,255,255,0.3)")
              }
            >
              <MessageCircle size={12} />
              Support
            </button>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)" }}>
              Secured · Encrypted · Trusted
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
