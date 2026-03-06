"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Mail, MailOpen, Trash2, Loader2 } from "lucide-react";
import type { ContactMessage } from "@/shared/schema";

export default function AdminMessagesPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchMessages = async () => {
    try {
      const response = await fetch("/api/admin/messages");
      if (response.status === 401) {
        router.push("/admin");
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const toggleRead = async (id: string, currentRead: boolean) => {
    try {
      await fetch("/api/admin/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, read: !currentRead }),
      });
      setMessages(prev =>
        prev.map(m => (m.id === id ? { ...m, read: !currentRead } : m))
      );
    } catch (error) {
      console.error("Failed to update message:", error);
    }
  };

  const deleteMessage = async (id: string) => {
    try {
      await fetch("/api/admin/messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setMessages(prev => prev.filter(m => m.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  const unreadCount = messages.filter(m => !m.read).length;

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/admin")} data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Contact Messages</h1>
            <p className="text-muted-foreground text-sm">
              {messages.length === 0
                ? "No messages yet"
                : `${messages.length} message${messages.length !== 1 ? "s" : ""}${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
            </p>
          </div>
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="text-center py-16">
          <Mail className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No contact messages yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <Card
              key={msg.id}
              className={`transition-colors cursor-pointer ${!msg.read ? "border-primary/30 bg-primary/5" : ""}`}
              data-testid={`card-message-${msg.id}`}
              onClick={() => {
                setExpandedId(expandedId === msg.id ? null : msg.id);
                if (!msg.read) {
                  toggleRead(msg.id, false);
                }
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {!msg.read ? (
                        <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                      ) : (
                        <MailOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className={`font-medium text-sm truncate ${!msg.read ? "text-foreground" : "text-muted-foreground"}`} data-testid={`text-sender-${msg.id}`}>
                        {msg.name}
                      </span>
                      <span className="text-xs text-muted-foreground/60 flex-shrink-0">
                        {formatDate(msg.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate" data-testid={`text-email-${msg.id}`}>
                      {msg.email}
                    </p>
                    {expandedId !== msg.id && (
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {msg.message}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRead(msg.id, msg.read);
                      }}
                      title={msg.read ? "Mark as unread" : "Mark as read"}
                      data-testid={`button-toggle-read-${msg.id}`}
                    >
                      {msg.read ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMessage(msg.id);
                      }}
                      title="Delete message"
                      data-testid={`button-delete-${msg.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {expandedId === msg.id && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-foreground whitespace-pre-wrap" data-testid={`text-message-${msg.id}`}>
                      {msg.message}
                    </p>
                    <div className="mt-3">
                      <a
                        href={`mailto:${msg.email}?subject=Re: Your message on ONCEPOSTED`}
                        className="text-xs text-primary hover:underline"
                        data-testid={`link-reply-${msg.id}`}
                      >
                        Reply to {msg.email}
                      </a>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
