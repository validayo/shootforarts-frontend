import React from 'react';
import About from '../../components/about/About';
import SEO from '../../components/seo/SEO';

const AboutPage: React.FC = () => {
  return (
    <>
      <SEO
        title="About - Shoot For Arts"
        description="Meet Ayo, a photographer and software engineer who tells stories through color, creativity, and authentic photography."
        keywords={["Ayo","photographer","creative photography","Shoot For Arts","storytelling photos","photo artist","software engineer"]}
        ogTitle="About - Shoot For Arts"
        ogDescription="Ayo is the creative behind Shoot For Arts, using photography to tell stories full of color, emotion, and meaning."
        ogImage="https://obhiuvlfopgtbgjuznok.supabase.co/storage/v1/object/public/images/others/metadata.png"
        canonicalPath="/about"
      />
      <About />
    </>
  );
};

export default AboutPage;
