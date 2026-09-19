import Link from "next/link";
import { ArrowLeft, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PostcardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 px-6">
      <div className="p-6 rounded-full bg-muted">
        <ImageOff className="h-12 w-12 text-muted-foreground" />
      </div>
      <div className="text-center space-y-2">
        <h1 className="text-xl font-light text-foreground">Postcard not found</h1>
        <p className="text-muted-foreground max-w-md">
          This postcard may have been removed or the link might be incorrect.
        </p>
      </div>
      <Button asChild variant="outline" className="gap-2">
        <Link href="/collection">
          <ArrowLeft className="h-4 w-4" />
          Browse Collection
        </Link>
      </Button>
    </div>
  );
}
