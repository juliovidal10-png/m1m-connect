import ConversationDeletionReview from "@/components/config/ConversationDeletionReview";
export default async function Page({params}:{params:Promise<{companyId:string}>}){const {companyId}=await params;return <ConversationDeletionReview key={companyId} companyId={companyId}/>;}
