/**
 * Tanggal operasional toko dalam WIB (Asia/Jakarta), format YYYY-MM-DD.
 * Dipakai sebagai satu-satunya sumber tanggal "hari ini" agar konsisten
 * (menggantikan `new Date().toISOString().slice(0, 10)` yang memakai UTC
 * dan bisa mundur/maju 1 hari sekitar tengah malam WIB).
 */
export function getWIBDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
