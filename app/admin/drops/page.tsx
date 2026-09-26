export default function AdminDropsPage() {
  return (
    <main>
      <div className="admin-page-head">
        <div><p>WORLD ENGINE</p><h1>DROPS</h1></div>
        <span className="admin-pill live">1 SCHEDULED</span>
      </div>
      <table className="admin-table">
        <thead><tr><th>WORLD</th><th>DROP</th><th>ACCESS</th><th>STATUS</th><th>OPEN</th></tr></thead>
        <tbody>
          <tr>
            <td><strong>WORLD 002</strong></td>
            <td>DROP 002</td>
            <td>EMAIL / CODE READY</td>
            <td><span className="admin-pill">SCHEDULED</span></td>
            <td>CONFIGURED FROM ENV UNTIL DB PERSISTENCE LANDS</td>
          </tr>
        </tbody>
      </table>
    </main>
  );
}
