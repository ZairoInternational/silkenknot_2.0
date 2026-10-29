import { BannerEditor } from "@/components/admin/BannersManager";

export const metadata = { title: "Edit campaign" };

type PageProps = { params: Promise<{ id: string }> };

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <BannerEditor id={id} />;
}
