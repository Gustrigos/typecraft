import "./globals.css";

export const metadata = {
  title: "Minecraft Clone",
  description: "A Minecraft clone built with Next.js 14, Three.js and React Three Fiber",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, overflow: "hidden" }}>{children}</body>
    </html>
  );
} 