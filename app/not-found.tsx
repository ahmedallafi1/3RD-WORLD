import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found">
      <div className="not-found__globe">◎</div>
      <p>404</p>
      <h1>YOU&apos;VE LEFT THE WORLD.</h1>
      <Link href="/">RETURN HOME</Link>
    </main>
  );
}
