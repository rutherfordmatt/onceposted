import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Submit a Postcard",
  description: "Share your vintage postcard with our community. Submit front and back images of your postcards for review.",
  openGraph: {
    title: "Submit a Postcard | ONCEPOSTED",
    description: "Share your vintage postcard with our community. Submit front and back images of your postcards for review.",
    type: "website",
  },
};

export default function SubmitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
