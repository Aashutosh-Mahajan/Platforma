import type { ReactNode } from 'react';

import Cart from '../components/Cart';


type RootLayoutProps = {
    children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
    return (
        <html lang="en">
            <body className="bg-[#fcf9f8] text-[#1b1b1b]">
                {children}
                <Cart />
            </body>
        </html>
    );
}