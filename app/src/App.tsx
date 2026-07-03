import type { ReactNode } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { NeuralBackdrop } from "./components/NeuralBackdrop";
import HomePage from "./features/home/HomePage";
import GalleryPage from "./features/gallery/GalleryPage";
import DetailPage from "./features/detail/DetailPage";
import IdentifyGame from "./features/identify/IdentifyGame";
import ExplainPage from "./features/explain/ExplainPage";
import DreamsPage from "./features/dreams/DreamsPage";

function NavLink({ to, children }: { to: string; children: ReactNode }) {
  const { pathname } = useLocation();
  const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
  return (
    <Link to={to} className={`nav-link${active ? " active" : ""}`}>
      {children}
    </Link>
  );
}

export default function App() {
  const location = useLocation();
  const reduce = useReducedMotion();

  return (
    <>
      <NeuralBackdrop />
      <header className="nav">
        <div className="wrap nav-inner">
          <Link to="/" className="brand" aria-label="NeuroGallery, home">
            <span className="brand-dot" /> NeuroGallery
          </Link>
          <nav aria-label="Main navigation" className="nav-links">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/gallery">Gallery</NavLink>
            <NavLink to="/explain">Method</NavLink>
            <NavLink to="/dreams">Dreams</NavLink>
            <NavLink to="/identify">Identify</NavLink>
          </nav>
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/explain" element={<ExplainPage />} />
            <Route path="/dreams" element={<DreamsPage />} />
            <Route path="/item/:id" element={<DetailPage />} />
            <Route path="/identify" element={<IdentifyGame />} />
          </Routes>
        </motion.main>
      </AnimatePresence>
    </>
  );
}
