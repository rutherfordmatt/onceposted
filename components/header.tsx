"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { LogOut, Shield, Plus, X, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, [pathname]);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/check");
      const data = await response.json();
      setIsAdmin(data.authenticated);
    } catch {
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setIsAdmin(false);
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="flex h-14 items-center justify-between">
          <Link 
            href="/" 
            className="text-lg font-light tracking-wider text-foreground hover:text-foreground/80 transition-colors uppercase"
            data-testid="link-home-logo"
          >
            ONCEPOSTED
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              href="/"
              className={cn(
                "px-3 py-2 transition-colors",
                pathname === "/"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              data-testid="link-nav-home"
            >
              <Home className="h-4 w-4" />
            </Link>
            <Link
              href="/collection"
              className={cn(
                "px-4 py-2 text-sm font-light tracking-wide transition-colors",
                pathname === "/collection"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              data-testid="link-nav-collection"
            >
              Collection
            </Link>
            <Dialog>
              <DialogTrigger asChild>
                <button
                  className="px-4 py-2 text-sm font-light tracking-wide transition-colors text-muted-foreground hover:text-foreground"
                  data-testid="button-nav-about"
                >
                  About
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </DialogClose>
                <DialogHeader>
                  <DialogTitle className="text-xl font-light tracking-wide">About Once Posted</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    Once Posted is a small archive of postcards that were written, sent, and then forgotten.
                  </p>
                  <p>
                    Many of these cards are found in flea markets, antique shops, and boxes of ephemera. They have been separated from the people who wrote them and the people who received them. What remains is the message, captured in a moment of ordinary life.
                  </p>
                  <p>
                    Postcards were never meant to last. They were written quickly, travelled briefly, and often discarded. That is exactly why they matter. They record everyday history rather than major events. Weather, travel, routine, affection. Small details that rarely survive.
                  </p>
                  <p>
                    This site exists to preserve those fragments. The front of a card shows where someone was. The back shows what they chose to say. Together, they offer a quiet glimpse into how people once moved through the world.
                  </p>
                  <p className="italic">
                    These cards were once posted. Now, they are simply kept.
                  </p>
                  <p className="pt-2 text-xs text-muted-foreground/60">
                    Made with love by{" "}
                    <a
                      href="https://mattrutherford.co.uk"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-4 hover:text-muted-foreground transition-colors"
                      data-testid="link-about-matt"
                    >
                      Matt Rutherford
                    </a>
                  </p>
                </div>
              </DialogContent>
            </Dialog>
            <Link
              href="/submit"
              className={cn(
                "px-4 py-2 text-sm font-light tracking-wide transition-colors flex items-center gap-1.5",
                pathname === "/submit"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              data-testid="link-nav-submit"
            >
              <Plus className="h-3.5 w-3.5" />
              Submit
            </Link>
            <Link
              href="/contact"
              className={cn(
                "px-4 py-2 text-sm font-light tracking-wide transition-colors",
                pathname === "/contact"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              data-testid="link-nav-contact"
            >
              Contact
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className={cn(
                  "px-4 py-2 text-sm font-light tracking-wide transition-colors flex items-center gap-1.5",
                  pathname.startsWith("/admin")
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                data-testid="link-nav-admin"
              >
                <Shield className="h-3.5 w-3.5" />
                Admin
              </Link>
            )}
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Logout"
                className="h-8 w-8"
                data-testid="button-header-logout"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            )}
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </header>
  );
}
