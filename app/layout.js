import "./globals.css";
import AppProviders from "@/components/AppProviders";

export const metadata = {
  title: "CardPortal",
  description: "Adyen Balance Platform fintech demo",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

