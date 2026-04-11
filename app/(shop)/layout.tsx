import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import ChatWidgetLazy from "@/components/chat/ChatWidgetLazy"
import ScrollToTop from "@/components/ui/ScrollToTop"
import PromoPopupLazy from "@/components/ui/PromoPopupLazy"
import AdminModeProvider from "@/components/admin/AdminModeProvider"

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminModeProvider>
      <Header />
      <main>{children}</main>
      <Footer />
      <ScrollToTop />
      <ChatWidgetLazy />
      <PromoPopupLazy />
    </AdminModeProvider>
  )
}
