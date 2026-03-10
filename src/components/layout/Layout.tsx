import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import Newsletter from '../newsletter/Newsletter';
import FunJokesPopup from '../fun/FunJokesPopup';

const Layout: React.FC = () => {
  const [funEnabled, setFunEnabled] = useState(false);
  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-secondary"
      >
        Skip to main content
      </a>
      <Navbar funEnabled={funEnabled} onToggleFun={() => setFunEnabled((v) => !v)} />
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>
      <Newsletter />
      <FunJokesPopup open={funEnabled} onClose={() => setFunEnabled(false)} />
      <Footer />
    </div>
  );
};

export default Layout;
