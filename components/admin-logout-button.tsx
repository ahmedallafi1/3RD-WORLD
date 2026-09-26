"use client";

export function AdminLogoutButton(){
  async function logout(){
    await fetch("/api/admin/session",{method:"DELETE"});
    window.location.assign("/admin/login");
  }
  return <button className="admin-logout" onClick={logout}>SIGN OUT</button>;
}
