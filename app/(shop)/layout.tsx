import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import ChatWidget from "@/components/chat/ChatWidget"
import AdminModeProvider from "@/components/admin/AdminModeProvider"

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminModeProvider>
      <Header />
      <main>{children}</main>
      <Footer />
      <ChatWidget />
    </AdminModeProvider>
  )
}
