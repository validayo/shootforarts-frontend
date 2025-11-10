import React from "react";
import Gallery from "../components/Gallery";
import NewsletterPopup from "../components/NewsletterPopup";

const HomePage: React.FC = () => {
  return (
    <div className="pt-10">
      <NewsletterPopup />
      <Gallery />
    </div>
  );
};

export default HomePage;
