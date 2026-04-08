import BookingSteps from '../../components/eventraLanding/BookingSteps';
import CTASection from '../../components/eventraLanding/CTASection';
import Footer from '../../components/eventraLanding/Footer';
import HeroSection from '../../components/eventraLanding/HeroSection';
import Navbar from '../../components/eventraLanding/Navbar';
import RecentEvents from '../../components/eventraLanding/RecentEvents';
import TickerStrip from '../../components/eventraLanding/TickerStrip';

export default function EventraPremiumLandingPage() {
  return (
    <div className="theme-eventra-premium min-h-screen bg-eventra-bg">
      <Navbar />
      <main>
        <HeroSection />
        <TickerStrip />
        <RecentEvents />
        <BookingSteps />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
