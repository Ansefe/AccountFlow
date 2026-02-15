import React from "react";
import { colors, fonts } from "../styles";

interface MockAppFrameProps {
  activePage: string;
  pageTitle: string;
  children: React.ReactNode;
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "profiles", label: "Profiles", icon: "🖥️" },
  { id: "sessions", label: "My Sessions", icon: "🕐" },
  { id: "credits", label: "Credits", icon: "🪙" },
];

const configItems = [{ id: "settings", label: "Settings", icon: "⚙️" }];

const adminItems = [
  { id: "admin-dashboard", label: "Admin Dashboard", icon: "📈" },
  { id: "admin-profiles", label: "Manage Profiles", icon: "💾" },
  { id: "admin-users", label: "Manage Users", icon: "👥" },
  { id: "admin-activity", label: "Activity Log", icon: "📜" },
];

export const MockAppFrame: React.FC<MockAppFrameProps> = ({
  activePage,
  pageTitle,
  children,
}) => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: colors.bg,
        fontFamily: fonts.inter,
        overflow: "hidden",
      }}
    >
      {/* Title bar */}
      <div
        style={{
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          background: colors.bgSecondary,
          borderBottom: `1px solid ${colors.border}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              background: `linear-gradient(135deg, ${colors.accent}, #a78bfa)`,
            }}
          />
          <span style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary }}>
            AccountFlow
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["─", "□", "✕"].map((icon, i) => (
            <div
              key={i}
              style={{
                width: 28,
                height: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                color: colors.textMuted,
                borderRadius: 3,
              }}
            >
              {icon}
            </div>
          ))}
        </div>
      </div>

      {/* Main body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar */}
        <div
          style={{
            width: 196,
            background: colors.bgSecondary,
            borderRight: `1px solid ${colors.border}`,
            display: "flex",
            flexDirection: "column",
            padding: "12px 8px",
            flexShrink: 0,
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 8px 16px",
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                background: `linear-gradient(135deg, ${colors.accent}, #a78bfa)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span
              style={{
                fontSize: 15,
                fontWeight: 800,
                background: `linear-gradient(135deg, ${colors.accent}, #a78bfa)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              AccountFlow
            </span>
          </div>

          {/* Main nav */}
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activePage === item.id}
            />
          ))}

          {/* Config section */}
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: colors.textMuted,
              padding: "12px 8px 4px",
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            Config
          </div>
          {configItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activePage === item.id}
            />
          ))}

          {/* Admin section */}
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: colors.textMuted,
              padding: "12px 8px 4px",
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            Admin
          </div>
          {adminItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activePage === item.id}
            />
          ))}

          {/* Bottom: Plan badge + user */}
          <div style={{ marginTop: "auto" }}>
            {/* Plan badge */}
            <div
              style={{
                background: colors.accent + "18",
                border: `1px solid ${colors.accent}30`,
                borderRadius: 8,
                padding: "8px 10px",
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: colors.textPrimary }}>
                Plan Early Bird
              </div>
              <div style={{ fontSize: 10, color: colors.textSecondary }}>
                1760 Credits
              </div>
            </div>

            {/* User */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                borderRadius: 6,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: colors.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "white",
                }}
              >
                A
              </div>
              <span style={{ fontSize: 13, color: colors.textPrimary, fontWeight: 500 }}>
                admin
              </span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke={colors.textMuted}
                strokeWidth="2"
                style={{ marginLeft: "auto" }}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>
        </div>

        {/* Content area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Header */}
          <div
            style={{
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 24px",
              borderBottom: `1px solid ${colors.border}`,
              flexShrink: 0,
            }}
          >
            <h1 style={{ fontSize: 17, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
              {pageTitle}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13, color: colors.warning }}>🪙</span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: fonts.mono,
                    color: colors.textPrimary,
                  }}
                >
                  1760
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 8px",
                  borderRadius: 6,
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: colors.accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "white",
                  }}
                >
                  A
                </div>
                <span style={{ fontSize: 13, color: colors.textPrimary }}>admin</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth="2">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>
          </div>

          {/* Page content */}
          <div style={{ flex: 1, overflow: "hidden", padding: 20 }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

const NavItem: React.FC<{ icon: string; label: string; active: boolean }> = ({
  icon,
  label,
  active,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "7px 10px",
      borderRadius: 6,
      fontSize: 13,
      fontWeight: active ? 600 : 400,
      color: active ? colors.textPrimary : colors.textSecondary,
      background: active ? colors.accent + "20" : "transparent",
      marginBottom: 2,
      borderLeft: active ? `2px solid ${colors.accent}` : "2px solid transparent",
    }}
  >
    <span style={{ fontSize: 14 }}>{icon}</span>
    {label}
  </div>
);
