import React from 'react';
import SEO from '../../../components/seo/SEO';
import About from '../components/About';

const AboutPage: React.FC = () => {
  return (
    <>
      <SEO
        title="About Ayo | Shoot For Arts Toronto Photographer"
        description="Meet Ayo, the Toronto photographer behind Shoot For Arts, creating portraits, headshots, branding sessions, events, and story-driven imagery."
        ogTitle="About Ayo | Shoot For Arts Toronto Photographer"
        ogDescription="Meet Ayo, the photographer behind Shoot For Arts, known for portraits, headshots, branding sessions, events, and story-driven imagery."
        ogImage="https://obhiuvlfopgtbgjuznok.supabase.co/storage/v1/object/public/images/others/metadata.png"
        canonicalPath="/about"
      />
      <About />
    </>
  );
};

export default AboutPage;
