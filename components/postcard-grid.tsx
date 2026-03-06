"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MapPin, Calendar, User, RotateCcw } from "lucide-react";

interface Postcard {
  id: string;
  title: string | null;
  location: string | null;
  dateMonth: number | null;
  dateYear: number | null;
  dateIsUnknown: boolean;
  submitterName: string;
  frontThumbPath: string;
  backThumbPath: string;
  frontImagePath: string;
  backImagePath: string;
  messageText: string | null;
  createdAt: string;
}

interface PostcardGridProps {
  postcards: Postcard[];
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

export function PostcardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <div className="aspect-[4/3] bg-muted animate-pulse" />
          <CardContent className="p-4 space-y-3">
            <div className="h-5 bg-muted animate-pulse rounded w-3/4" />
            <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
            <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function PostcardGrid({ postcards }: PostcardGridProps) {
  const [selectedPostcard, setSelectedPostcard] = useState<Postcard | null>(null);
  const [showBack, setShowBack] = useState(false);
  const [imageLoaded, setImageLoaded] = useState<Record<string, boolean>>({});

  const handleCardClick = (postcard: Postcard) => {
    setSelectedPostcard(postcard);
    setShowBack(false);
  };

  const handleClose = () => {
    setSelectedPostcard(null);
    setShowBack(false);
  };

  const handleImageLoad = (id: string) => {
    setImageLoaded(prev => ({ ...prev, [id]: true }));
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {postcards.map((postcard) => (
          <Card
            key={postcard.id}
            className="overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
            onClick={() => handleCardClick(postcard)}
            data-testid={`card-postcard-${postcard.id}`}
          >
            <div className="aspect-[4/3] relative overflow-hidden bg-muted">
              {!imageLoaded[postcard.id] && (
                <div className="absolute inset-0 bg-muted animate-pulse" />
              )}
              <img
                src={postcard.frontThumbPath}
                alt={postcard.title || "Vintage postcard"}
                className="w-full h-full object-cover"
                loading="lazy"
                onLoad={() => handleImageLoad(postcard.id)}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </div>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-foreground line-clamp-1">
                {postcard.title || "Untitled Postcard"}
              </h3>
              
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {postcard.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="line-clamp-1">{postcard.location}</span>
                  </div>
                )}
                {(postcard.dateYear || postcard.dateIsUnknown) && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{formatDate(postcard.dateMonth, postcard.dateYear, postcard.dateIsUnknown)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3 flex-shrink-0" />
                <span>Submitted by {postcard.submitterName}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedPostcard} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {selectedPostcard && (
            <>
              <div className="relative">
                <div className="aspect-[4/3] relative overflow-hidden bg-muted">
                  <img
                    src={showBack ? selectedPostcard.backImagePath : selectedPostcard.frontImagePath}
                    alt={showBack ? "Back of postcard" : "Front of postcard"}
                    className="w-full h-full object-contain"
                    sizes="(max-width: 768px) 100vw, 768px"
                  />
                  <Badge 
                    className="absolute top-4 left-4"
                    variant="secondary"
                  >
                    {showBack ? "Back" : "Front"}
                  </Badge>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute bottom-4 right-4 gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowBack(!showBack);
                    }}
                    data-testid="button-flip-postcard"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Flip Card
                  </Button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <DialogHeader>
                  <DialogTitle className="text-xl">
                    {selectedPostcard.title || "Untitled Postcard"}
                  </DialogTitle>
                  <DialogDescription asChild>
                    <div className="flex flex-wrap gap-4 text-sm">
                      {selectedPostcard.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span>{selectedPostcard.location}</span>
                        </div>
                      )}
                      {(selectedPostcard.dateYear || selectedPostcard.dateIsUnknown) && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span>{formatDate(selectedPostcard.dateMonth, selectedPostcard.dateYear, selectedPostcard.dateIsUnknown)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4 text-primary" />
                        <span>Submitted by {selectedPostcard.submitterName}</span>
                      </div>
                    </div>
                  </DialogDescription>
                </DialogHeader>

                {selectedPostcard.messageText && (
                  <div className="pt-4 border-t border-border">
                    <h4 className="text-sm font-medium text-foreground mb-2">Message on Postcard</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap italic">
                      "{selectedPostcard.messageText}"
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
