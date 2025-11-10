import React from "react";
import Gallery from "../components/Gallery";
import NewsletterPopup from "../components/NewsletterPopup";
import SEO from "../components/SEO";

const HomePage: React.FC = () => {
  return (
    <div className="pt-10">
      <SEO
        title="Shoot For Arts - Life is better with cherished memories."
        description="Ayo captures emotion and color through portraits, events, and creative shoots. Shoot For Arts is all about storytelling through every frame."
        keywords={["photography","portraits","event photography","creative shoots","storytelling photos","Shoot For Arts","Ayo"]}
        ogTitle="Shoot For Arts - Life is better with cherished memories."
        ogDescription="Explore the work of Ayo. Shoot For Arts captures emotion, color, and connection through portraits, events, and creative shoots anywhere in the world."
        ogImage="https://obhiuvlfopgtbgjuznok.supabase.co/storage/v1/object/public/images/others/metadata.png"
        canonicalPath="/"
      />
      <NewsletterPopup />
      <Gallery />
    </div>
  );
};

export default HomePage;
