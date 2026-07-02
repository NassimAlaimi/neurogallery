import { Link, Route, Routes } from "react-router-dom";

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
        <Route path="/" element={<Stub name="Accueil" />} />
        <Route path="/gallery" element={<Stub name="Galerie" />} />
        <Route path="/item/:id" element={<Stub name="Détail" />} />
        <Route path="/identify" element={<Stub name="Identification" />} />
      </Routes>
    </>
  );
}
