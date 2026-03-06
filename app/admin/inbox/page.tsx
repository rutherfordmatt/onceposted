"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Check, AlertCircle, Search } from "lucide-react";
import { normalizeImagePath } from "@/lib/image-utils";

interface InboxPostcard {
  id: string;
  frontThumbPath: string;
  title: string | null;
  location: string | null;
  dateMonth: number | null;
  dateYear: number | null;
  dateIsUnknown: boolean;
  missingFields: string[];
}

export default function MetadataInboxPage() {
  const router = useRouter();
  const [postcards, setPostcards] = useState<InboxPostcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchInboxItems();
  }, []);

  const fetchInboxItems = async () => {
    try {
      const response = await fetch("/api/admin/inbox");
      if (!response.ok) {
        throw new Error("Failed to fetch inbox");
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
        (p.title?.toLowerCase().includes(query)) ||
        (p.location?.toLowerCase().includes(query))
    );
  }, [postcards, searchQuery]);

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
          <h1 className="text-2xl font-bold text-foreground">Metadata Inbox</h1>
          <p className="text-muted-foreground">
            {postcards.length === 0 
              ? "All postcards have complete metadata!" 
              : `${postcards.length} postcard${postcards.length === 1 ? "" : "s"} need metadata`}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm" data-testid="text-error">
          {error}
        </div>
      )}

      {postcards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-foreground">All caught up!</p>
              <p className="text-muted-foreground">Every postcard has complete metadata.</p>
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
              placeholder="Search by title or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>

          {filteredPostcards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No postcards match your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPostcards.map((postcard) => (
                <Card key={postcard.id} className="overflow-hidden" data-testid={`card-postcard-${postcard.id}`}>
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
                      <div className="space-y-1">
                        {postcard.title && (
                          <p className="text-sm font-medium text-foreground truncate">{postcard.title}</p>
                        )}
                        {postcard.location && (
                          <p className="text-xs text-muted-foreground truncate">{postcard.location}</p>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {postcard.missingFields.map((field) => (
                            <Badge 
                              key={field} 
                              variant="secondary" 
                              className="text-xs flex items-center gap-1"
                            >
                              <AlertCircle className="h-3 w-3" />
                              {field}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-end mt-2">
                        <Button 
                          size="sm" 
                          onClick={() => router.push(`/admin/postcards/${postcard.id}/edit?from=inbox`)}
                          data-testid={`button-fix-${postcard.id}`}
                        >
                          Fix
                        </Button>
                      </div>
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
