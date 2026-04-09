"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  WifiOff,
  CheckCircle2,
  AlertCircle,
  Crown,
  User,
  Mail,
  X,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils/time";

interface Admin {
  id: string;
  user_id: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

interface ConfirmDialog {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

function useNetwork() {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

export default function SettingsPage() {
  const router = useRouter();
  const online = useNetwork();

  const [admins, setAdmins] = useState<Admin[]>([]);
  const [currentAdminId, setCurrentAdminId] = useState("");
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirm, setConfirm] = useState<ConfirmDialog>({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Add admin form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("admin");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadAdmins();
    setTimeout(() => setMounted(true), 50);
  }, []);

  function showToast(type: "success" | "error", message: string) {
    const toastId = Date.now();
    setToasts((prev) => [...prev, { id: toastId, type, message }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== toastId)),
      3500,
    );
  }

  function showConfirm(title: string, message: string, onConfirm: () => void) {
    setConfirm({ open: true, title, message, onConfirm });
  }

  function closeConfirm() {
    setConfirm({ open: false, title: "", message: "", onConfirm: () => {} });
  }

  async function loadAdmins() {
    try {
      const res = await fetch("/api/admin/settings/admins");
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (res.status === 403) {
        router.replace("/admin/dashboard");
        return;
      }
      const data = await res.json();
      setAdmins(data.admins || []);
      setCurrentAdminId(data.current_admin_id || "");
    } catch {
      showToast("error", "Failed to load admins.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddAdmin() {
    if (!newEmail.trim() || !newEmail.includes("@")) {
      showToast("error", "Please enter a valid email address.");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/admin/settings/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail.trim(), role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast("error", data.error || "Failed to add admin.");
        return;
      }
      showToast("success", `${newEmail} added as ${newRole}.`);
      setNewEmail("");
      setNewRole("admin");
      setShowAddForm(false);
      loadAdmins();
    } catch {
      showToast("error", "Network error. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  function confirmRemoveAdmin(admin: Admin) {
    if (admin.id === currentAdminId) {
      showToast("error", "You cannot remove yourself.");
      return;
    }
    showConfirm(
      "Remove Admin",
      `Remove ${admin.email} from admin access? They will no longer be able to log in.`,
      async () => {
        closeConfirm();
        try {
          const res = await fetch(`/api/admin/settings/admins/${admin.id}`, {
            method: "DELETE",
          });
          if (!res.ok) {
            showToast("error", "Failed to remove admin.");
            return;
          }
          showToast("success", `${admin.email} removed.`);
          loadAdmins();
        } catch {
          showToast("error", "Network error. Please try again.");
        }
      },
    );
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0B1E35" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #F9A825, #E65100)" }}
          >
            <ShieldCheck className="w-6 h-6" style={{ color: "#0B1E35" }} />
          </div>
          <Loader2
            className="w-5 h-5 animate-spin"
            style={{ color: "#F9A825" }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0B1E35" }}
    >
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl pointer-events-auto"
            style={{
              background:
                toast.type === "success"
                  ? "rgba(22,163,74,0.95)"
                  : "rgba(220,38,38,0.95)",
              border: `1px solid ${toast.type === "success" ? "rgba(74,222,128,0.3)" : "rgba(252,165,165,0.3)"}`,
              backdropFilter: "blur(12px)",
              animation: "slideIn 0.2s ease forwards",
              minWidth: "280px",
            }}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-white" />
            )}
            <p className="text-xs font-semibold text-white">{toast.message}</p>
          </div>
        ))}
      </div>

      {/* Confirm dialog */}
      {confirm.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6"
            style={{
              background: "#0F2540",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <h3 className="text-base font-bold text-white mb-2">
              {confirm.title}
            </h3>
            <p
              className="text-sm mb-6"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              {confirm.message}
            </p>
            <div className="flex gap-3">
              <button
                onClick={closeConfirm}
                className="flex-1 py-3 rounded-2xl text-xs font-semibold transition-all active:scale-95"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirm.onConfirm}
                className="flex-1 py-3 rounded-2xl text-xs font-bold transition-all active:scale-95"
                style={{ background: "rgba(220,38,38,0.9)", color: "#ffffff" }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Network banner */}
      {!online && (
        <div
          className="w-full py-2.5 px-4 flex items-center justify-center gap-2 text-xs font-semibold"
          style={{ background: "#DC2626", color: "#ffffff" }}
        >
          <WifiOff className="w-3.5 h-3.5" />
          No internet connection
        </div>
      )}

      {/* Header */}
      <div
        className="w-full px-6 py-4 flex items-center justify-between sticky top-0 z-10"
        style={{
          background: "#0B1E35",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <button
          onClick={() => router.push("/admin/dashboard")}
          className="flex items-center gap-2 text-xs font-medium transition-opacity hover:opacity-60"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </button>
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: "rgba(249,168,37,0.15)",
              border: "1px solid rgba(249,168,37,0.3)",
            }}
          >
            <ShieldCheck className="w-4 h-4" style={{ color: "#F9A825" }} />
          </div>
          <span className="text-xs font-bold" style={{ color: "#F9A825" }}>
            OSEM Secure Vote
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Title */}
          <div
            className="mb-8"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(12px)",
              transition: "all 0.4s ease",
            }}
          >
            <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              Manage admin access and system configuration
            </p>
          </div>

          {/* Admin Management */}
          <div
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(12px)",
              transition: "all 0.4s ease 0.1s",
            }}
          >
            {/* Section header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-white">Admin Users</h2>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  {admins.length} admin{admins.length !== 1 ? "s" : ""} with
                  access
                </p>
              </div>
              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, #F9A825, #E65100)",
                    color: "#0B1E35",
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Admin
                </button>
              )}
            </div>

            {/* Add admin form */}
            {showAddForm && (
              <div
                className="rounded-2xl p-5 mb-4"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(249,168,37,0.3)",
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-bold text-white">Add New Admin</p>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewEmail("");
                      setNewRole("admin");
                    }}
                    className="p-1.5 rounded-lg transition-all hover:opacity-60"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Email */}
                  <div>
                    <label
                      className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                        style={{ color: "rgba(255,255,255,0.3)" }}
                      />
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddAdmin()}
                        placeholder="admin@example.com"
                        autoFocus
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none"
                        style={{
                          background: "rgba(255,255,255,0.07)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "#ffffff",
                        }}
                      />
                    </div>
                    <p
                      className="text-xs mt-1.5"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      Must be a Google account — they&apos;ll sign in with
                      Google OAuth
                    </p>
                  </div>

                  {/* Role */}
                  <div>
                    <label
                      className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      Role
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        {
                          value: "admin",
                          label: "Admin",
                          desc: "Manage elections",
                          icon: User,
                        },
                        {
                          value: "super_admin",
                          label: "Super Admin",
                          desc: "Full access + settings",
                          icon: Crown,
                        },
                      ].map((role) => (
                        <button
                          key={role.value}
                          type="button"
                          onClick={() => setNewRole(role.value)}
                          className="p-3 rounded-xl text-left transition-all"
                          style={{
                            background:
                              newRole === role.value
                                ? "rgba(249,168,37,0.15)"
                                : "rgba(255,255,255,0.05)",
                            border:
                              newRole === role.value
                                ? "1px solid rgba(249,168,37,0.4)"
                                : "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <role.icon
                              className="w-3.5 h-3.5"
                              style={{
                                color:
                                  newRole === role.value
                                    ? "#F9A825"
                                    : "rgba(255,255,255,0.4)",
                              }}
                            />
                            <span
                              className="text-xs font-bold"
                              style={{
                                color:
                                  newRole === role.value
                                    ? "#F9A825"
                                    : "rgba(255,255,255,0.7)",
                              }}
                            >
                              {role.label}
                            </span>
                          </div>
                          <p
                            className="text-xs"
                            style={{ color: "rgba(255,255,255,0.3)" }}
                          >
                            {role.desc}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        setNewEmail("");
                        setNewRole("admin");
                      }}
                      className="px-5 py-3 rounded-xl text-xs font-semibold transition-all active:scale-95"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        color: "rgba(255,255,255,0.5)",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddAdmin}
                      disabled={adding || !newEmail.trim() || !online}
                      className="flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
                      style={{
                        background: "linear-gradient(135deg, #F9A825, #E65100)",
                        color: "#0B1E35",
                      }}
                    >
                      {adding ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      Add Admin
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Admins list */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {admins.length === 0 ? (
                <div className="py-10 text-center">
                  <p
                    className="text-sm"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                  >
                    No admins found
                  </p>
                </div>
              ) : (
                admins.map((admin, idx) => (
                  <div
                    key={admin.id}
                    className="px-5 py-4 flex items-center gap-4"
                    style={{
                      borderBottom:
                        idx < admins.length - 1
                          ? "1px solid rgba(255,255,255,0.05)"
                          : "none",
                    }}
                  >
                    {/* Avatar */}
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-sm font-black"
                      style={{
                        background:
                          admin.role === "super_admin"
                            ? "rgba(249,168,37,0.15)"
                            : "rgba(255,255,255,0.08)",
                        border:
                          admin.role === "super_admin"
                            ? "1px solid rgba(249,168,37,0.3)"
                            : "1px solid rgba(255,255,255,0.1)",
                        color:
                          admin.role === "super_admin"
                            ? "#F9A825"
                            : "rgba(255,255,255,0.6)",
                      }}
                    >
                      {admin.role === "super_admin" ? (
                        <Crown className="w-5 h-5" />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-white truncate">
                          {admin.email}
                        </p>
                        {admin.id === currentAdminId && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-bold shrink-0"
                            style={{
                              background: "rgba(22,163,74,0.15)",
                              color: "#4ADE80",
                            }}
                          >
                            You
                          </span>
                        )}
                        <span
                          className="text-xs px-2 py-0.5 rounded-full shrink-0"
                          style={{
                            background:
                              admin.role === "super_admin"
                                ? "rgba(249,168,37,0.12)"
                                : "rgba(255,255,255,0.07)",
                            color:
                              admin.role === "super_admin"
                                ? "#F9A825"
                                : "rgba(255,255,255,0.4)",
                          }}
                        >
                          {admin.role === "super_admin"
                            ? "Super Admin"
                            : "Admin"}
                        </span>
                      </div>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: "rgba(255,255,255,0.3)" }}
                      >
                        {admin.last_login_at
                          ? `Last login: ${formatDateTime(admin.last_login_at)}`
                          : `Added: ${formatDateTime(admin.created_at)}`}
                      </p>
                    </div>

                    {/* Remove button */}
                    {admin.id !== currentAdminId && (
                      <button
                        onClick={() => confirmRemoveAdmin(admin)}
                        className="p-2 rounded-xl transition-all hover:opacity-60 shrink-0"
                        style={{ color: "rgba(255,255,255,0.3)" }}
                        title="Remove admin"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Role legend */}
            <div
              className="mt-4 rounded-2xl p-4"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <p
                className="text-xs font-bold mb-3"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                ROLE PERMISSIONS
              </p>
              <div className="space-y-2">
                {[
                  {
                    role: "Admin",
                    color: "rgba(255,255,255,0.5)",
                    perms:
                      "Create elections, manage candidates, upload voters, view results",
                  },
                  {
                    role: "Super Admin",
                    color: "#F9A825",
                    perms:
                      "All admin permissions + manage other admins + system settings",
                  },
                ].map((r) => (
                  <div key={r.role} className="flex items-start gap-3">
                    <span
                      className="text-xs font-bold shrink-0 mt-0.5"
                      style={{ color: r.color }}
                    >
                      {r.role}
                    </span>
                    <p
                      className="text-xs"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      {r.perms}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="w-full px-6 py-4 flex items-center justify-between"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: online ? "#16A34A" : "#DC2626" }}
          />
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            {online ? "Connection secure" : "No connection"}
          </p>
        </div>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
          Powered by{" "}
          <span
            className="font-semibold"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            OSEM Technologies
          </span>
        </p>
      </div>
    </div>
  );
}
