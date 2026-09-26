import {ContentPageView} from "@/components/content-page";

export const metadata={title:"FAQ"};
export const dynamic="force-dynamic";

export default function Page(){
  return <ContentPageView slug="faq"/>;
}
