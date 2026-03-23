import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import ChatWidget from "@/components/chat/ChatWidget"

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
      <ChatWidget />
    </>
  )
}
