
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Stats } from './components/Stats';
import { Features } from './components/Features';
import { Collections } from './components/Collections';
import { Experience } from './components/Experience';
import { Download } from './components/Download';
import { Footer } from './components/Footer';

function App() {
  return (
    <div className="min-h-screen bg-surface">
      <Header />
      <main>
        <Hero />
        <Stats />
        <div className="max-w-7xl mx-auto px-8 py-20">
          <Features />
          <Collections />
          <Experience />
          <Download />
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default App;
