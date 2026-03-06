import Link from "next/link";
import { Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/50 py-8 mt-16">
      <div className="container mx-auto px-6 max-w-7xl text-center">
        <p className="text-sm text-muted-foreground font-light flex items-center justify-center gap-1.5">
          Made with <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500" /> by{" "}
          <a
            href="https://mattrutherford.co.uk"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
            data-testid="link-footer-matt"
          >
            Matt Rutherford
          </a>
        </p>
      </div>
    </footer>
  );
}
