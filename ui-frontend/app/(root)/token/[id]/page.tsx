import TokenDetailPage from "~~/components/token/TokenDetailPage";

export default function Page({ params }: { params: { id: string } }) {
  return <TokenDetailPage tokenId={params.id} />;
}
