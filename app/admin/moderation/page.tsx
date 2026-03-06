"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Check, Inbox, Search } from "lucide-react";
import { normalizeImagePath } from "@/lib/image-utils";

interface PendingPostcard {
  id: string;
  frontThumbPath: string;
  submitterName: string;
  submitterEmail: string | null;
  title: string | null;
  location: string | null;
  createdAt: string;
}

function ModerationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const actionMessage = searchParams.get("action");
  
  const [postcards, setPostcards] = useState<PendingPostcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchPendingPostcards();
  }, []);

  const fetchPendingPostcards = async () => {
    try {
      const response = await fetch("/api/admin/moderation");
      if (!response.ok) {
        throw new Error("Failed to fetch pending postcards");
      }
      const data = await response.json();
      setPostcards(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPostcards = useMemo(() => {
    if (!searchQuery.trim()) return postcards;
    const query = searchQuery.toLowerCase();
    return postcards.filter(
      (p) =>
        p.submitterName.toLowerCase().includes(query) ||
        (p.title?.toLowerCase().includes(query)) ||
        (p.location?.toLowerCase().includes(query))
    );
  }, [postcards, searchQuery]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
          <h1 className="text-2xl font-bold text-foreground">Moderation Queue</h1>
          <p className="text-muted-foreground">
            {postcards.length === 0 
              ? "No pending submissions" 
              : `${postcards.length} submission${postcards.length === 1 ? "" : "s"} awaiting review`}
          </p>
        </div>
      </div>

      {actionMessage === "approved" && (
        <div className="p-4 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm flex items-center gap-2" data-testid="text-success">
          <Check className="h-4 w-4" />
          Postcard approved and is now visible in the gallery!
        </div>
      )}

      {actionMessage === "rejected" && (
        <div className="p-4 rounded-md bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-sm flex items-center gap-2" data-testid="text-rejected">
          <Check className="h-4 w-4" />
          Postcard rejected and will not appear publicly.
        </div>
      )}

      {error && (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm" data-testid="text-error">
          {error}
        </div>
      )}

      {postcards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="rounded-full bg-muted p-4">
              <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-foreground">No pending submissions</p>
              <p className="text-muted-foreground">New visitor submissions will appear here for review.</p>
            </div>
            <Button variant="outline" onClick={() => router.push("/admin")}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, title, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>

          {filteredPostcards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No submissions match your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPostcards.map((postcard) => (
                <Card 
                  key={postcard.id} 
                  className="overflow-hidden hover-elevate cursor-pointer" 
                  onClick={() => router.push(`/admin/moderation/${postcard.id}`)}
                  data-testid={`card-postcard-${postcard.id}`}
                >
                  <div className="flex">
                    <div className="w-32 h-24 flex-shrink-0 bg-muted">
                      <img
                        src={normalizeImagePath(postcard.frontThumbPath)}
                        alt="Postcard thumbnail"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <CardContent className="flex-1 p-3 flex flex-col justify-between">
                      <div>
                        <p className="font-medium text-foreground truncate">
                          {postcard.submitterName}
                        </p>
                        {postcard.title && (
                          <p className="text-sm text-muted-foreground truncate">
                            {postcard.title}
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Submitted {formatDate(postcard.createdAt)}
                      </p>
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ModerationListPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <ModerationContent />
    </Suspense>
  );
}
