import './globals.css';

export const metadata = {
  title: 'Baby Kick Counter',
  description: 'Simple baby kick counting and movement pattern tracker',
  manifest: '/manifest.json',
  themeColor: '#f7d8e8'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
