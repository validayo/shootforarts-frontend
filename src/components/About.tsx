import React from "react";
import { motion } from "framer-motion";
import { Instagram, Mail } from "lucide-react";

const About: React.FC = () => {
  return (
    <motion.div className="container-custom py-20 mt-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-9 mb-20 items-center">
          {/* Left side — image */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
            <img
              src="https://obhiuvlfopgtbgjuznok.supabase.co/storage/v1/object/public/images/others/AYO.jpg"
              alt="Ayodeji Adigun — Shoot For Arts"
              className="w-full h-auto max-w-[420px] md:max-w-full object-cover rounded-xl shadow-lg mx-auto md:mx-0"
            />
          </motion.div>

          {/* Right side — heading + text */}
          <motion.div className="min-w-0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
            <h2 className="text-3xl md:text-4xl font-serif mb-6 tracking-wide">About Shoot For Arts</h2>
            <p className="mb-4 text-lg leading-relaxed">
              I’m Ayo, I founded Shoot For Arts with the intention to bring art, emotion, and storytelling into every frame. I love capturing still moments that
              hold emotion, knowing each image can be seen through different lenses and tell different stories to different people. I’ve always been drawn to
              how color, light, and atmosphere can shape a mood and make a photo feel alive.
            </p>
            <p className="text-lg leading-relaxed">
              I got into photography back in high school, when I picked up a camera for the first time. I was obsessed. Since then, I’ve fallen in love with
              cameras and photography as a whole. Photography brings me joy because it lets me express how I see the world. Every shoot feels like a chance to
              create something meaningful and freeze a moment that speaks without words.
            </p>
          </motion.div>
        </div>

        {/* Process Section */}
        <motion.h3
          className="text-2xl font-serif mb-6 tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          My Process
        </motion.h3>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <div className="border border-accent p-6 rounded-lg bg-secondary/20">
            <h4 className="font-serif text-xl mb-3">Consultation</h4>
            <p className="text-accent-dark">I start with a conversation to understand your goals, ideas, and creative direction.</p>
          </div>

          <div className="border border-accent p-6 rounded-lg bg-secondary/20">
            <h4 className="font-serif text-xl mb-3">Creation</h4>
            <p className="text-accent-dark">During the shoot, we collaborate to capture real emotions and artistic compositions.</p>
          </div>

          <div className="border border-accent p-6 rounded-lg bg-secondary/20">
            <h4 className="font-serif text-xl mb-3">Curation</h4>
            <p className="text-accent-dark">Every image is thoughtfully selected and edited to deliver a cohesive, expressive gallery.</p>
          </div>
        </motion.div>

        {/* Connect Section */}
        <motion.div className="mt-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.7 }}>
          <h3 className="text-2xl font-serif mb-6 tracking-wide">Connect</h3>
          <p className="text-lg mb-4">I’m always open to collaborations and new projects. Reach out to discuss your next shoot or creative idea.</p>
          <div className="flex items-center space-x-6">
            <a
              href="https://instagram.com/shootforarts"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-primary hover:text-accent-dark transition-colors duration-300"
            >
              <Instagram size={18} className="mr-2" />
              @shootforarts
            </a>
            <a href="mailto:contact@shootforarts.com" className="flex items-center text-primary hover:text-accent-dark transition-colors duration-300">
              <Mail size={18} className="mr-2" />
              contact@shootforarts.com
            </a>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default About;
