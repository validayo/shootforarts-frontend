import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trackJokeInteraction, trackPopupShown, trackPopupClosed } from "../lib/analytics";

type Joke = { q: string; a: string };

const JOKES: Joke[] = [
  { q: "Why shouldn’t you ever steal a photographer’s lens?", a: "He has a photographic memory." },
  { q: "What kind of photos do lobsters take the most?", a: "Shellfies." },
  { q: "Why didn’t the camera try to fulfill his dream of being a racecar driver?", a: "He thought he might burst on the track." },
  { q: "Why didn’t the jury find the photograph guilty of his wife’s murder?", a: "They thought someone had framed him." },
  { q: "Why was Cinderella so hopeful about her photos?", a: "She knew her prints would come one day." },
  { q: "Why did the camera stop dreaming about a career in photography?", a: "He couldn’t remain focused." },
  { q: "What did the woman think about her friend who was a photographer?", a: "She wished someone would shutter up." },
  { q: "Why did a man always rave about how great his digital camera was?", a: "He couldn’t think of any negatives." },
  { q: "Why was the unpredictable photographer not invited to any event?", a: "Everyone thought he was a loose Canon." },
  { q: "What does a photographer need to hang up his photos?", a: "Jpegs." },
  { q: "When did the sunset photographer realize he had struck gold?", a: "During golden hour." },
  { q: "How do you seduce a photographer?", a: "Turn off the lights and see if anything develops." },
  { q: "What’s the difference between a large pepperoni pizza and a struggling photographer?", a: "A large pepperoni pizza can feed a family of four." },
  { q: "What’s wrong with most cameras that won’t take good pictures?", a: "The nut behind the viewfinder!" },
  { q: "Did you hear about how the photographer died?", a: "It makes me shutter." },
  { q: "Where does a cow hang his photos?", a: "In a mooooooseum." },
  { q: "Did you hear about the guy who stole all those photos?", a: "I think he was framed." },
  { q: "Why did the photographer get into an argument with the curator at the art gallery?", a: "He wasn’t in the right frame of mind." },
  { q: "What do you call a photo taken by a cat?", a: "A paw-trait." },
  { q: "What did Snow White say when her photos weren’t ready yet?", a: "Some Day My Prints Will Come!" },
  { q: "Why can’t you find good photography jokes?", a: "They haven’t been developed yet." },
  { q: "If a picture is worth a thousand words, then why shouldn’t we judge a book by its cover?", a: "Because context matters more than appearance." },
  { q: "What’s the fastest way to make money from photography?", a: "Sell your camera." },
  { q: "What have photographers been known to do?", a: "Flash people." },
  { q: "What happened when a photographer said his camera didn’t have continuous high speed mode?", a: "I almost BURST out laughing." },
  { q: "Why was the photographer arrested?", a: "Flashing and indecent exposure…" },
];

const getRandomJoke = () => JOKES[Math.floor(Math.random() * JOKES.length)];

interface FunJokesPopupProps {
  open: boolean;
  onClose: () => void;
}

const FunJokesPopup: React.FC<FunJokesPopupProps> = ({ open, onClose }) => {
  const [joke, setJoke] = useState<Joke>(() => getRandomJoke());
  const [guess, setGuess] = useState("");
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    if (open) trackPopupShown();
  }, [open]);

  const close = () => {
    trackPopupClosed();
    onClose();
  };

  const checkGuess = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = (s: string) => s.replace(/[^a-z0-9]+/gi, "").toLowerCase();
    const correct = normalized(guess) === normalized(joke.a);
    setReveal(true);
    trackJokeInteraction(correct ? "Guess Correct" : "Guess Wrong");
  };

  const nextJoke = () => {
    setJoke(getRandomJoke());
    setGuess("");
    setReveal(false);
    trackJokeInteraction("Next Joke Clicked");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={close} />
          <motion.div
            className="relative w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden bg-white"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            {/* Close (top-right, red) */}
            <button onClick={close} aria-label="Close" className="absolute top-3 right-3 w-9 h-9 rounded-full bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 z-10">×</button>

            <div className="p-6 md:p-8">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl md:text-3xl font-serif text-gray-900">A little photo humor</h3>
                  <p className="mt-1 text-gray-600 text-sm">Toggle is for fun — turn it on whenever you want a laugh.</p>
                </div>
              </div>

              <div className="mt-5 p-4 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-800">Guess the punchline:</div>
                <div className="mt-1 text-gray-700">{joke.q}</div>
                <form onSubmit={checkGuess} className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    placeholder="Your guess"
                    className="flex-1 border border-gray-300 rounded px-3 py-2"
                  />
                  <button type="submit" className="px-3 py-2 bg-gray-900 text-white rounded">Guess</button>
                  <button type="button" onClick={nextJoke} className="px-3 py-2 bg-white border rounded hover:bg-gray-100">Next Joke</button>
                </form>
                {reveal && (
                  <div className="mt-2 text-sm">
                    {guess.trim() && guess.trim().toLowerCase() === joke.a.trim().toLowerCase() ? (
                      <span className="text-green-700">Yes! {joke.a}</span>
                    ) : (
                      <span className="text-gray-700">Hahaha… it’s “{joke.a}”</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FunJokesPopup;

