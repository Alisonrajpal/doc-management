import { useState, useEffect } from "react";
import { Bell, X, CheckCircle, XCircle, Clock, FileText } from "lucide-react";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("notifications");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setNotifications(parsed);
        setUnreadCount(parsed.filter((n) => !n.read).length);
      } catch (e) {
        console.error("Failed to load notifications", e);
      }
    }
  }, []);

  // Save notifications to localStorage
  const saveNotifications = (newNotifications) => {
    localStorage.setItem("notifications", JSON.stringify(newNotifications));
    setNotifications(newNotifications);
    setUnreadCount(newNotifications.filter((n) => !n.read).length);
  };

  // Mark notification as read
  const markAsRead = (id) => {
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n,
    );
    saveNotifications(updated);
  };

  // Mark all as read
  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    saveNotifications(updated);
  };

  // Delete notification
  const deleteNotification = (id) => {
    const updated = notifications.filter((n) => n.id !== id);
    saveNotifications(updated);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "approved":
        return <CheckCircle size={16} color="#10b981" />;
      case "rejected":
        return <XCircle size={16} color="#ef4444" />;
      case "pending":
        return <Clock size={16} color="#f59e0b" />;
      default:
        return <FileText size={16} color="#3b82f6" />;
    }
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour ago`;
    return `${diffDays} day ago`;
  };

  // Simple toggle function
  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={toggleDropdown}
        style={{
          position: "relative",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "8px",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          width: "36px",
          height: "36px",
        }}>
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "2px",
              right: "2px",
              backgroundColor: "#ef4444",
              color: "white",
              fontSize: "10px",
              borderRadius: "10px",
              padding: "2px 6px",
              minWidth: "18px",
              textAlign: "center",
            }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowDropdown(false)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9998,
            }}
          />

          {/* Dropdown - fixed position at top right of screen */}
          <div
            style={{
              position: "fixed",
              top: "60px",
              left: "200px",
              width: "340px",
              maxHeight: "450px",
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow:
                "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.02)",
              zIndex: 9999,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              border: "1px solid #e5e7eb",
            }}>
            <div
              style={{
                padding: "14px 16px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#f9fafb",
              }}>
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#1f2937",
                }}>
                Notifications
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  style={{
                    fontSize: "11px",
                    color: "#3b82f6",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}>
                  Mark all as read
                </button>
              )}
            </div>

            <div style={{ overflowY: "auto", maxHeight: "380px" }}>
              {notifications.length === 0 ? (
                <div
                  style={{
                    padding: "40px 20px",
                    textAlign: "center",
                    color: "#9ca3af",
                    fontSize: "13px",
                  }}>
                  <Bell
                    size={28}
                    style={{ marginBottom: "12px", opacity: 0.4 }}
                  />
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => markAsRead(notif.id)}
                    style={{
                      padding: "14px 16px",
                      borderBottom: "1px solid #f3f4f6",
                      backgroundColor: notif.read ? "white" : "#eff6ff",
                      cursor: "pointer",
                      transition: "background-color 0.2s",
                    }}>
                    <div
                      style={{
                        display: "flex",
                        gap: "12px",
                        alignItems: "flex-start",
                      }}>
                      <div style={{ marginTop: "2px", flexShrink: 0 }}>
                        {getNotificationIcon(notif.type)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p
                          style={{
                            fontSize: "13px",
                            fontWeight: "500",
                            color: "#1f2937",
                          }}>
                          {notif.title}
                        </p>
                        <p
                          style={{
                            fontSize: "12px",
                            color: "#6b7280",
                            marginTop: "4px",
                            lineHeight: "1.4",
                          }}>
                          {notif.message}
                        </p>
                        <p
                          style={{
                            fontSize: "10px",
                            color: "#9ca3af",
                            marginTop: "6px",
                          }}>
                          {getTimeAgo(notif.createdAt)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notif.id);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#9ca3af",
                          padding: "4px",
                          flexShrink: 0,
                        }}>
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
