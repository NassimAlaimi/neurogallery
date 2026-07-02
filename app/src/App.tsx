import { Link, Route, Routes } from "react-router-dom";
import HomePage from "./features/home/HomePage";
import GalleryPage from "./features/gallery/GalleryPage";
import DetailPage from "./features/detail/DetailPage";

function Stub({ name }: { name: string }) {
  return <main style={{ padding: "var(--space-32)" }}><h1>{name}</h1></main>;
}

export default function App() {
  return (
    <>
      <header style={{ padding: "var(--space-16) var(--space-32)", borderBottom: "1px solid var(--color-line)" }}>
        <nav aria-label="Navigation principale" style={{ display: "flex", gap: "var(--space-24)" }}>
          <Link to="/">Accueil</Link>
          <Link to="/gallery">Galerie</Link>
          <Link to="/identify">Identification</Link>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/item/:id" element={<DetailPage />} />
        <Route path="/identify" element={<Stub name="Identification" />} />
      </Routes>
    </>
  );
}
