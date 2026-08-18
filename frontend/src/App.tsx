import { useCallback, useEffect, useRef, useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Services from './components/Services';
import ServicesModal from './components/ServicesModal';
import Trabajamos from './components/Trabajamos';
import CtaFinal from './components/CtaFinal';
import Footer from './components/Footer';
import ContactModal from './components/ContactModal';
import { services, HEADING_TEXT } from './data/services';
import type { HeadingWord } from './types';

function headingWords(progress: number): HeadingWord[] {
  const words = HEADING_TEXT.split(' ');
  return words.map((word, i) => {
    const threshold = (i + 0.5) / words.length;
    return {
      text: word + (i < words.length - 1 ? ' ' : ''),
      active: progress >= threshold,
    };
  });
}

type NavSection = 'inicio' | 'servicios';

export default function App() {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<NavSection>('inicio');
  const [headingProgress, setHeadingProgress] = useState(0);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [servicesModalOpen, setServicesModalOpen] = useState(false);
  const [servicesCardsVisible, setServicesCardsVisible] = useState(false);
  const [preselectedService, setPreselectedService] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reducedMotionRef = useRef(false);

  const openServicesModal = useCallback((id: number | null) => {
    setServicesModalOpen(true);
    setServicesCardsVisible(false);
    setPreselectedService(id);
    window.setTimeout(() => setServicesCardsVisible(true), 30);
  }, []);
  const closeServicesModal = useCallback(() => setServicesModalOpen(false), []);

  const selectService = useCallback((id: number) => {
    setServicesModalOpen(false);
    setContactModalOpen(true);
    setPreselectedService(id);
  }, []);

  const openContactModal = useCallback(() => {
    setContactModalOpen(true);
    setPreselectedService(null);
  }, []);
  const closeContactModal = useCallback(() => setContactModalOpen(false), []);

  // Scroll: navbar state, video parallax, and the heading word-reveal progress.
  useEffect(() => {
    reducedMotionRef.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    const onScroll = () => {
      setScrolled(window.scrollY > 40);

      if (videoRef.current && !reducedMotionRef.current) {
        const y = Math.min(window.scrollY * 0.15, window.innerHeight * 0.2);
        videoRef.current.style.transform = `translateY(${y}px)`;
      }

      if (headingRef.current) {
        const rect = headingRef.current.getBoundingClientRect();
        const start = window.innerHeight * 0.88;
        const end = window.innerHeight * 0.4;
        const raw = (start - rect.top) / (start - end);
        const progress = Math.max(0, Math.min(1, raw));
        setHeadingProgress((prev) => (Math.abs(progress - prev) > 0.01 ? progress : prev));
      }

      // Nav "active" pill follows scroll position: once the Servicios section has crossed
      // roughly the upper third of the viewport, highlight it instead of Inicio.
      const servicios = document.getElementById('servicios');
      const inServicios = servicios ? servicios.getBoundingClientRect().top <= window.innerHeight * 0.35 : false;
      setActiveSection((prev) => {
        const next = inServicios ? 'servicios' : 'inicio';
        return prev === next ? prev : next;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Escape closes whichever modal is open.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (contactModalOpen) setContactModalOpen(false);
      else if (servicesModalOpen) setServicesModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [contactModalOpen, servicesModalOpen]);

  // Lock page scroll while any modal is open.
  useEffect(() => {
    const anyOpen = contactModalOpen || servicesModalOpen;
    document.body.style.overflow = anyOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [contactModalOpen, servicesModalOpen]);

  // Autoplay the hero video at a slightly slower rate, muted.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = 0.75;
    v.muted = true;
    const tryPlay = () => v.play().catch(() => {});
    const onLoaded = () => {
      v.playbackRate = 0.75;
      tryPlay();
    };
    v.addEventListener('loadedmetadata', onLoaded);
    tryPlay();
    return () => v.removeEventListener('loadedmetadata', onLoaded);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', background: '#14141a', color: '#F6F1EC', fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif", overflowX: 'hidden' }}>
      <Navbar scrolled={scrolled} activeSection={activeSection} onNavigate={setActiveSection} onOpenContact={openContactModal} />
      <Hero videoRef={videoRef} />
      <Services headingRef={headingRef} headingWords={headingWords(headingProgress)} services={services} onCardClick={openServicesModal} />
      <ServicesModal open={servicesModalOpen} cardsVisible={servicesCardsVisible} services={services} onClose={closeServicesModal} onSelect={selectService} />
      <Trabajamos />
      <CtaFinal onOpenContact={openContactModal} />
      <Footer />
      <ContactModal
        open={contactModalOpen}
        services={services}
        preselectedService={preselectedService}
        onClose={closeContactModal}
        onSelectService={setPreselectedService}
      />
    </div>
  );
}
