import type { Metadata } from "next";
import { AdvertiseLanding } from "@/components/ads/advertise-landing";
import PageIntro from "@/components/pages/page-intro";
import { getSitePage } from "@/lib/pages";

export const metadata: Metadata = {
  title: getSitePage("advertise")!.metaTitle,
  description: getSitePage("advertise")!.metaDescription,
};

export default function AdvertisePage() {
  return (
    <>
      <PageIntro slug="advertise" />
      <AdvertiseLanding />
    </>
  );
}