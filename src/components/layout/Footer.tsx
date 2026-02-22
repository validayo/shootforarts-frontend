import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Mail } from 'lucide-react';
import { trackOutboundClick } from '../../lib/analytics/events';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="py-8 border-t border-accent mt-auto">
      <div className="container-custom">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <Link to="/" className="text-xl tracking-widest font-serif text-primary uppercase">
              Shoot For Arts
            </Link>
          </div>
          
          <div className="flex items-center space-x-6">
            <a 
              href="https://instagram.com/shootforarts" 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={() => trackOutboundClick("https://instagram.com/shootforarts", "footer")}
              className="text-accent-dark hover:text-primary transition-colors duration-300"
              aria-label="Instagram"
            >
              <Instagram size={18} />
            </a>
            <a 
              href="mailto:contact@shootforarts.com"
              onClick={() => trackOutboundClick("mailto:contact@shootforarts.com", "footer")}
              className="text-accent-dark hover:text-primary transition-colors duration-300"
              aria-label="Email"
            >
              <Mail size={18} />
            </a>
            <Link 
              to="/about" 
              className="text-accent-dark hover:text-primary transition-colors duration-300"
            >
              About
            </Link>
            <Link 
              to="/services" 
              className="text-accent-dark hover:text-primary transition-colors duration-300"
            >
              Services
            </Link>
            <Link 
              to="/services#services-faq" 
              className="text-accent-dark hover:text-primary transition-colors duration-300"
            >
              FAQ
            </Link>
            <Link 
              to="/contact" 
              className="text-accent-dark hover:text-primary transition-colors duration-300"
            >
              Contact
            </Link>
          </div>
        </div>
        
        <div className="mt-6 text-center md:text-left text-sm text-accent-dark">
          <p>&copy; {currentYear} Shoot For Arts. All rights reserved.</p>
          <p className="mt-2">
            <a 
              href="mailto:contact@shootforarts.com"
              onClick={() => trackOutboundClick("mailto:contact@shootforarts.com", "footer")}
              className="hover:text-primary transition-colors duration-300"
            >
              contact@shootforarts.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer
