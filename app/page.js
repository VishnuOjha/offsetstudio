import SmoothScroll from '@/components/SmoothScroll';
import CloudBackground from '@/components/CloudBackground';
import Preloader from '@/components/Preloader';
import Cursor from '@/components/Cursor';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Marquee from '@/components/Marquee';
import Statement from '@/components/Statement';
import Services from '@/components/Services';
import Work from '@/components/Work';
import Awards from '@/components/Awards';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <SmoothScroll>
      <CloudBackground />
      <Preloader />
      <Cursor />
      <Header />
      <main>
        <Hero />
        <Marquee text="Now booking projects for 2027" />
        <Statement />
        <Services />
        <Work />
        <Awards />
      </main>
      <Footer />
    </SmoothScroll>
  );
}
