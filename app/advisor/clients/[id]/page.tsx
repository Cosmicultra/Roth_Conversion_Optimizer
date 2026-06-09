import { AdvisorClientWorksheet } from "@/components/advisor/advisor-client-worksheet";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdvisorClientPage({ params }: Props) {
  const { id } = await params;
  return <AdvisorClientWorksheet profileId={id} />;
}
