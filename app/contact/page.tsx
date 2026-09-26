import {ContentPageView} from "@/components/content-page";

export const metadata={title:"Contact"};
export const dynamic="force-dynamic";

export default function Page(){
  return <ContentPageView slug="contact"/>;
}
