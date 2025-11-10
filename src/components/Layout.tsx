import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import Newsletter from './Newsletter';
import FunJokesPopup from './FunJokesPopup';

const Layout: React.FC = () => {
  const [funEnabled, setFunEnabled] = useState(false);
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar funEnabled={funEnabled} onToggleFun={() => setFunEnabled((v) => !v)} />
      <main className="flex-1">
        <Outlet />
      </main>
      <Newsletter />
      <FunJokesPopup open={funEnabled} onClose={() => setFunEnabled(false)} />
      <Footer />
    </div>
  );
};

export default Layout;
