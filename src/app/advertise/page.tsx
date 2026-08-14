import type { Metadata } from "next";
import { AdvertiseLanding } from "@/components/ads/advertise-landing";
import { getSitePage } from "@/lib/pages";

export const metadata: Metadata = {
  title: getSitePage("advertise")!.metaTitle,
  description: getSitePage("advertise")!.metaDescription,
};

export default function AdvertisePage() {
  return <AdvertiseLanding />;
}