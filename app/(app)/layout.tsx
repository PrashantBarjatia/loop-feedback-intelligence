import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 flex flex-col pl-56 min-h-screen">
        <Topbar />
        <main className="p-8 max-w-6xl mx-auto w-full">{children}</main>
      </div>
    </div>
  );
}