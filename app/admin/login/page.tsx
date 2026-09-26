import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin-login-form";
import { getAdminUser } from "@/lib/auth/session";

export const metadata={title:"Admin Login"};

export default async function AdminLoginPage(){
  const user=await getAdminUser();
  if(user)redirect("/admin");

  return (
    <main className="admin-login-page">
      <div className="admin-login-mark">3RD WORLD</div>
      <section>
        <p>PRIVATE SYSTEM</p>
        <h1>ADMIN</h1>
        <AdminLoginForm/>
      </section>
    </main>
  );
}
