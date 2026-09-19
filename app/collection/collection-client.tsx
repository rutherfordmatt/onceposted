"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ImageOff, RefreshCw, RotateCcw, MapPin, Calendar, Mail, X, ExternalLink, Share2 } from "lucide-react";
import { SiX, SiBluesky, SiThreads, SiInstagram } from "react-icons/si";
import Link from "next/link";
import { normalizeImagePath } from "@/lib/image-utils";
import { NewBadge } from "@/components/new-badge";
import { StarRating } from "@/components/star-rating";
import { SITE_DESCRIPTION } from "@/lib/site";
import { type PublicPostcard, postcardAlt, postcardHref } from "@/lib/public-postcard";

type Postcard = PublicPostcard;

// Grid thumbnails are real links (so crawlers can follow them); a plain click
// opens the card in place, while ctrl/cmd/middle-click opens its page.
function openInPlace(e: React.MouseEvent, open: () => void) {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  open();
}

function cacheBustedUrl(path: string, updatedAt?: string): string {
  const normalized = normalizeImagePath(path);
  const v = updatedAt ? new Date(updatedAt).getTime() : Date.now();
  return `${normalized}?v=${v}`;
}

function formatDate(month: number | null, year: number | null, isUnknown: boolean): string {
  if (isUnknown) return "Date unknown";
  if (!year) return "";
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (month && month >= 1 && month <= 12) {
    return `${monthNames[month - 1]} ${year}`;
  }
  return String(year);
}

function PostcardModal({ postcard, onClose }: { postcard: Postcard; onClose: () => void }) {
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 md:p-8"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors z-50"
        data-testid="button-close-modal"
      >
        <X className="h-6 w-6" />
      </button>
      
      <div 
        className="w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative perspective-1000 cursor-pointer group"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div 
            className={`relative preserve-3d transition-transform duration-700 ease-out ${isFlipped ? "rotate-y-180" : ""}`}
            style={{ transformStyle: "preserve-3d" }}
          >
            <div 
              className="relative aspect-[4/3] rounded-sm overflow-hidden shadow-2xl backface-hidden"
            >
              <img
                src={cacheBustedUrl(postcard.frontImagePath, postcard.updatedAt)}
                alt={postcardAlt(postcard, "front")}
                className="w-full h-full object-contain"
              />
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-4 right-4 gap-2 bg-black/50 text-white border-0 backdrop-blur-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(true);
                }}
                data-testid="button-flip-front"
              >
                <RotateCcw className="h-4 w-4" />
                Flip
              </Button>
            </div>

            <div 
              className="absolute inset-0 aspect-[4/3] rounded-sm overflow-hidden shadow-2xl rotate-y-180 backface-hidden"
            >
              <img
                src={cacheBustedUrl(postcard.backImagePath, postcard.updatedAt)}
                alt={postcardAlt(postcard, "back")}
                className="w-full h-full object-contain"
              />
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-4 right-4 gap-2 bg-black/50 text-white border-0 backdrop-blur-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(false);
                }}
                data-testid="button-flip-back"
              >
                <RotateCcw className="h-4 w-4" />
                Flip
              </Button>
              {postcard.messageText && (
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-white/90 text-sm italic line-clamp-3">
                    "{postcard.messageText}"
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="absolute bottom-4 left-4 z-10">
            <NewBadge createdAt={postcard.createdAt} scheduledFor={postcard.scheduledFor} />
          </div>
        </div>

        <div className="mt-3 text-left">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <h2 className="text-lg font-light text-white leading-tight">
                {postcard.title || "Untitled"}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-white/70 text-sm">
                {postcard.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {postcard.location}
                  </span>
                )}
                {(postcard.dateYear || postcard.dateIsUnknown) && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(postcard.dateMonth, postcard.dateYear, postcard.dateIsUnknown)}
                  </span>
                )}
              </div>
              <p className="text-white/40 text-xs">
                Click the card to flip it
              </p>
            </div>
            <div className="flex flex-col items-end gap-0.5 pt-0.5" onClick={(e) => e.stopPropagation()}>
              <StarRating postcardId={postcard.id} />
              <Link
                href={postcardHref(postcard)}
                className="inline-flex items-center gap-1 text-white/60 hover:text-white text-xs transition-colors"
                data-testid="link-view-postcard"
              >
                <ExternalLink className="h-3 w-3" />
                View & Share
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CollectionGrid({ 
  postcards, 
  onSelect 
}: { 
  postcards: Postcard[];
  onSelect: (postcard: Postcard) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
      {postcards.map((postcard) => (
        <Link
          key={postcard.id}
          href={postcardHref(postcard)}
          prefetch={false}
          onClick={(e) => openInPlace(e, () => onSelect(postcard))}
          className="relative aspect-[4/3] overflow-hidden rounded-sm flex items-center justify-center [container-type:inline-size] transition-all duration-300 hover:opacity-80 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2 focus:ring-offset-background"
          data-testid={`card-postcard-${postcard.id}`}
        >
          {/* Sized in container units so the whole card fits the 4:3 cell uncropped,
              and the badge sits on the card rather than beside a portrait one. */}
          <span className="relative inline-block">
            <img
              src={cacheBustedUrl(postcard.frontThumbPath, postcard.updatedAt)}
              alt={postcardAlt(postcard, "front")}
              className="block rounded-sm"
              style={{ maxWidth: "100cqw", maxHeight: "75cqw" }}
              loading="lazy"
            />
            <span className="absolute bottom-1.5 left-1.5 z-10">
              <NewBadge createdAt={postcard.createdAt} scheduledFor={postcard.scheduledFor} compact />
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="pt-20 pb-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] bg-muted animate-pulse rounded-sm" />
          ))}
        </div>
      </div>
    </div>
  );
}

// Postcards arrive server-rendered from page.tsx. If the server couldn't load
// them (initialPostcards is null), fall back to fetching in the browser.
export default function CollectionClient({ initialPostcards }: { initialPostcards: Postcard[] | null }) {
  const [postcards, setPostcards] = useState<Postcard[]>(initialPostcards ?? []);
  const [isLoading, setIsLoading] = useState(initialPostcards === null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPostcard, setSelectedPostcard] = useState<Postcard | null>(null);

  const fetchPostcards = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/postcards");
      if (!response.ok) throw new Error("Failed to fetch postcards");
      const data = await response.json();
      setPostcards(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialPostcards === null) fetchPostcards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedPostcard) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedPostcard]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 px-6">
        <div className="p-6 rounded-full bg-muted">
          <ImageOff className="h-12 w-12 text-muted-foreground" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-light text-foreground">Something went wrong</h2>
          <p className="text-muted-foreground max-w-md">
            We couldn't load the postcards. Please try again.
          </p>
        </div>
        <Button onClick={fetchPostcards} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  if (postcards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8 px-6">
        <div className="p-8 rounded-full bg-muted/50">
          <Mail className="h-16 w-16 text-muted-foreground" />
        </div>
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-light text-foreground">No postcards yet</h1>
          <p className="text-muted-foreground max-w-md text-lg font-light">
            New postcards are added every week. Check back soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="pt-20 pb-16 min-h-screen">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-sm font-light tracking-widest text-muted-foreground uppercase">
              Vintage Postcard Collection
            </h1>
            <span className="text-sm text-muted-foreground">
              {postcards.length} postcard{postcards.length !== 1 ? "s" : ""}
            </span>
          </div>
          
          <CollectionGrid 
            postcards={postcards} 
            onSelect={setSelectedPostcard}
          />

          <p className="mt-12 max-w-2xl mx-auto text-center text-sm font-light leading-relaxed text-muted-foreground" data-testid="text-collection-intro">
            {SITE_DESCRIPTION}
          </p>
        </div>
      </div>

      {selectedPostcard && (
        <PostcardModal 
          postcard={selectedPostcard} 
          onClose={() => setSelectedPostcard(null)} 
        />
      )}
    </>
  );
}
