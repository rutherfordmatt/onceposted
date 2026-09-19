"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, MapPin, Calendar, ArrowLeft, Share2 } from "lucide-react";
import { SiX, SiBluesky, SiThreads, SiInstagram } from "react-icons/si";
import Link from "next/link";
import { normalizeImagePath } from "@/lib/image-utils";
import { NewBadge } from "@/components/new-badge";
import { StarRating } from "@/components/star-rating";
import { type PublicPostcard, postcardAlt, postcardHref } from "@/lib/public-postcard";
import { SITE_URL } from "@/lib/site";

type Postcard = PublicPostcard;

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

function ShareButtons({ postcard }: { postcard: Postcard }) {
  const [copied, setCopied] = useState(false);
  
  const pageUrl = `${SITE_URL}${postcardHref(postcard)}`;
  
  const shareTitle = postcard.title || "A vintage postcard";
  const shareText = postcard.location 
    ? `${shareTitle} from ${postcard.location}` 
    : shareTitle;
  const fullText = `${shareText} - Once Posted`;

  const handleShare = (platform: string) => {
    const encodedUrl = encodeURIComponent(pageUrl);
    const encodedText = encodeURIComponent(fullText);
    
    let shareUrl = "";
    
    switch (platform) {
      case "x":
        shareUrl = `https://x.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case "bluesky":
        shareUrl = `https://bsky.app/intent/compose?text=${encodedText}%20${encodedUrl}`;
        break;
      case "threads":
        shareUrl = `https://www.threads.net/intent/post?text=${encodedText}%20${encodedUrl}`;
        break;
      case "instagram":
        navigator.clipboard.writeText(`${fullText} ${pageUrl}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
    }
    
    if (shareUrl) {
      window.open(shareUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
        <Share2 className="h-3 w-3" />
        Share this postcard
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleShare("x")}
          title="Share on X"
          data-testid="button-share-x"
        >
          <SiX className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleShare("bluesky")}
          title="Share on Bluesky"
          data-testid="button-share-bluesky"
        >
          <SiBluesky className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleShare("threads")}
          title="Share on Threads"
          data-testid="button-share-threads"
        >
          <SiThreads className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleShare("instagram")}
          title={copied ? "Link copied!" : "Copy link for Instagram"}
          data-testid="button-share-instagram"
        >
          <SiInstagram className="h-4 w-4" />
        </Button>
      </div>
      {copied && (
        <p className="text-xs text-muted-foreground">Link copied to clipboard for Instagram</p>
      )}
    </div>
  );
}

// Rendered on the server with the postcard already loaded (see page.tsx),
// so search engines get the full content without running JavaScript.
export default function PostcardClientPage({ postcard }: { postcard: Postcard }) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="pt-20 pb-16">
      <div className="px-6 mb-6">
        <div className="max-w-4xl mx-auto">
          <Button asChild variant="ghost" size="sm" className="gap-1 mb-4 -ml-2">
            <Link href="/collection" data-testid="link-back-collection">
              <ArrowLeft className="h-4 w-4" />
              Collection
            </Link>
          </Button>
        </div>
      </div>

      <div className="px-6 mb-8">
        <div className="max-w-4xl mx-auto">
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
                  data-testid="img-postcard-front"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute bottom-4 right-4 gap-2 bg-black/50 text-white border-0 backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFlipped(true);
                  }}
                  data-testid="button-flip-to-back"
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
                  data-testid="img-postcard-back"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute bottom-4 right-4 gap-2 bg-black/50 text-white border-0 backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFlipped(false);
                  }}
                  data-testid="button-flip-to-front"
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
                <h1 className="text-2xl font-light text-foreground leading-tight" data-testid="text-postcard-title">
                  {postcard.title || "Untitled"}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-sm">
                  {postcard.location && (
                    <span className="flex items-center gap-1" data-testid="text-postcard-location">
                      <MapPin className="h-3.5 w-3.5" />
                      {postcard.location}
                    </span>
                  )}
                  {(postcard.dateYear || postcard.dateIsUnknown) && (
                    <span className="flex items-center gap-1" data-testid="text-postcard-date">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(postcard.dateMonth, postcard.dateYear, postcard.dateIsUnknown)}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground/60 text-xs">
                  Click the card to flip it
                </p>
              </div>
              <div className="flex flex-col items-end gap-0.5 pt-0.5" onClick={(e) => e.stopPropagation()}>
                <StarRating postcardId={postcard.id} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 mt-10">
        <div className="max-w-4xl mx-auto">
          <ShareButtons postcard={postcard} />
        </div>
      </div>
    </div>
  );
}
