import type { Service } from '../types';

export const services: Service[] = [
  {
    id: 0,
    tag: 'AI AGENTS',
    title: 'AI Agents',
    shortDesc: 'Agentes que atienden y venden 24/7',
    quote: '"Tu equipo de soporte que nunca duerme."',
    longDesc:
      'Desarrollamos agentes de IA personalizados para atención al cliente, ventas, soporte interno, RRHH y más. Conectados a tus herramientas y datos.',
    pills: ['Chatbots', 'Copilots', 'Integraciones'],
    gradient: 'linear-gradient(137deg,#9C93F0 0%,#F2A8C6 50%,#A8C7F0 100%)',
    color: '#9C93F0',
    icon: 'agents',
  },
  {
    id: 1,
    tag: 'AUTOMATIZACIÓN',
    title: 'Automatización',
    shortDesc: 'Procesos e integraciones sin fricción',
    quote: '"Menos clics, menos errores, más horas libres."',
    longDesc:
      'Automatizamos procesos e integraciones con n8n, APIs y tus plataformas actuales para ahorrarte tiempo y reducir costos.',
    pills: ['n8n', 'APIs', 'Workflows'],
    gradient: 'linear-gradient(137deg,#A8C7F0 0%,#9C93F0 50%,#F2A8C6 100%)',
    color: '#A8C7F0',
    icon: 'automation',
  },
  {
    id: 2,
    tag: 'PRODUCTOS',
    title: 'Productos',
    shortDesc: 'De MVP a producto escalable',
    quote: '"De prototipo a producto real, en semanas."',
    longDesc:
      'Creamos productos digitales con IA: SaaS, plataformas internas, MVPs y herramientas inteligentes escalables.',
    pills: ['SaaS', 'MVP', 'Escalable'],
    gradient: 'linear-gradient(137deg,#F2A8C6 0%,#A8C7F0 50%,#9C93F0 100%)',
    color: '#F2A8C6',
    icon: 'products',
  },
  {
    id: 3,
    tag: 'UX/UI DESIGN',
    title: 'UX/UI Design',
    shortDesc: 'Interfaces claras desde el primer clic',
    quote: '"Interfaces que se sienten obvias desde el primer clic."',
    longDesc:
      'Diseñamos experiencias excepcionales, desde UX Research hasta UI Design y prototipos listos para desarrollo.',
    pills: ['Research', 'UI Design', 'Prototipos'],
    gradient: 'linear-gradient(137deg,#9C93F0 0%,#A8C7F0 50%,#F2A8C6 100%)',
    color: '#9C93F0',
    icon: 'design',
  },
];

export const HEADING_TEXT =
  'Creamos agentes de IA y productos digitales que impulsan tu negocio.';
