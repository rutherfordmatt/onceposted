"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft, Calendar, Edit } from "lucide-react";
import { normalizeImagePath } from "@/lib/image-utils";

interface ScheduledPostcard {
  id: string;
  title: string | null;
  location: string | null;
  scheduledFor: string;
  frontThumbPath: string;
}

export default function ScheduledQueuePage() {
  const router = useRouter();
  const [postcards, setPostcards] = useState<ScheduledPostcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextSlot, setNextSlot] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/scheduled")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        setPostcards(data.scheduled || []);
        setNextSlot(data.nextSlot || null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/admin")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Scheduled Queue</h1>
          <p className="text-muted-foreground">
            {postcards.length === 0
              ? "No postcards scheduled"
              : `${postcards.length} postcard${postcards.length === 1 ? "" : "s"} in queue`}
          </p>
        </div>
      </div>

      {nextSlot && (
        <div className="p-3 rounded-md bg-muted text-sm text-muted-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Next available slot:{" "}
          <span className="font-medium text-foreground">
            {new Date(nextSlot).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm" data-testid="text-error">
          {error}
        </div>
      )}

      {postcards.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No scheduled postcards</p>
          <Button
            variant="outline"
            onClick={() => router.push("/admin/upload")}
            className="mt-4"
            data-testid="button-upload"
          >
            Upload a Postcard
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {postcards.map((pc) => (
            <Card
              key={pc.id}
              className="hover-elevate cursor-pointer"
              onClick={() => router.push(`/admin/postcards/${pc.id}/edit`)}
              data-testid={`card-scheduled-${pc.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-14 rounded overflow-hidden bg-muted flex-shrink-0">
                    <img
                      src={normalizeImagePath(pc.frontThumbPath)}
                      alt={pc.title || "Postcard"}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {pc.title || "Untitled"}
                    </p>
                    {pc.location && (
                      <p className="text-sm text-muted-foreground truncate">{pc.location}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(pc.scheduledFor).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(pc.scheduledFor).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <Edit className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
