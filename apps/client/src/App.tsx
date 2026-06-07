import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { BibliographyPanel } from './components/BibliographyPanel';
import { EditorShell } from './components/EditorShell';
import { StyleSelector } from './components/StyleSelector';
import { DocumentProvider, useDocument } from './context/DocumentContext';

type Route = '/' | '/features' | '/about' | '/contact' | '/dashboard' | '/dashboard/editor';

type NavItem = {
  label: string;
  path: Route;
};

const marketingNav: NavItem[] = [
  { label: 'Features', path: '/features' },
  { label: 'About', path: '/about' },
  { label: 'Contact', path: '/contact' },
];

const dashboardNav: NavItem[] = [
  { label: 'Editor', path: '/dashboard/editor' },
  { label: 'Sources', path: '/dashboard' },
];

function normalizePath(pathname: string): Route {
  if (
    pathname === '/' ||
    pathname === '/features' ||
    pathname === '/about' ||
    pathname === '/contact' ||
    pathname === '/dashboard' ||
    pathname === '/dashboard/editor'
  ) {
    return pathname;
  }

  return '/';
}

function useRoute() {
  const [route, setRoute] = useState<Route>(() => normalizePath(window.location.pathname));

  useEffect(() => {
    const handlePopState = () => setRoute(normalizePath(window.location.pathname));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((path: Route) => {
    window.history.pushState({}, '', path);
    setRoute(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return { route, navigate };
}

function AppLink({
  children,
  className,
  path,
  onNavigate,
}: {
  children: ReactNode;
  className?: string;
  path: Route;
  onNavigate: (path: Route) => void;
}) {
  return (
    <a
      className={className}
      href={path}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(path);
      }}
    >
      {children}
    </a>
  );
}

function MarketingShell({
  children,
  currentRoute,
  onNavigate,
}: {
  children: ReactNode;
  currentRoute: Route;
  onNavigate: (path: Route) => void;
}) {
  return (
    <div className="site-shell">
      <header className="site-header">
        <AppLink className="brand-lockup" path="/" onNavigate={onNavigate}>
          <span className="brand-mark">A</span>
          <span>AcademicOS</span>
        </AppLink>

        <nav className="site-nav" aria-label="Primary navigation">
          {marketingNav.map((item) => (
            <AppLink
              key={item.path}
              className={currentRoute === item.path ? 'nav-link nav-link--active' : 'nav-link'}
              path={item.path}
              onNavigate={onNavigate}
            >
              {item.label}
            </AppLink>
          ))}
        </nav>

        <AppLink className="primary-link" path="/dashboard/editor" onNavigate={onNavigate}>
          Open app
        </AppLink>
      </header>

      {children}
    </div>
  );
}

function LandingPage({ onNavigate }: { onNavigate: (path: Route) => void }) {
  return (
    <MarketingShell currentRoute="/" onNavigate={onNavigate}>
      <main>
        <section className="landing-hero">
          <div className="landing-hero__copy">
            <span className="eyebrow">Research writing SaaS</span>
            <h1>AcademicOS</h1>
            <p>
              A focused workspace for drafting, source discovery, citations, bibliography sync,
              document import, and polished export.
            </p>
            <div className="hero-actions">
              <button className="primary-link primary-link--button" type="button" onClick={() => onNavigate('/dashboard/editor')}>
                Start writing
              </button>
              <button className="secondary-link" type="button" onClick={() => onNavigate('/features')}>
                View features
              </button>
            </div>
          </div>

          <div className="product-visual" aria-label="AcademicOS dashboard preview">
            <div className="product-visual__bar">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div className="product-visual__body">
              <aside>
                <strong>Draft</strong>
                <span>Sources</span>
                <span>Exports</span>
              </aside>
              <section>
                <div className="visual-line visual-line--wide"></div>
                <div className="visual-line"></div>
                <div className="visual-editor">
                  <p>Climate adaptation requires locally grounded evidence <mark>[Smith, 2025]</mark></p>
                  <p>Imported formatting, citations, and bibliography output stay together.</p>
                </div>
              </section>
            </div>
          </div>
        </section>

        <section className="metric-band" aria-label="Product capabilities">
          <div>
            <strong>8</strong>
            <span>Ranked academic results</span>
          </div>
          <div>
            <strong>4</strong>
            <span>Citation styles</span>
          </div>
          <div>
            <strong>7</strong>
            <span>Export formats</span>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}

function FeaturesPage({ onNavigate }: { onNavigate: (path: Route) => void }) {
  const features = [
    'Rich document import with formatting-aware DOCX handling',
    'Academic search across Semantic Scholar, Crossref, PubMed, and Google Scholar',
    'Inline citation tokens that refresh when the citation style changes',
    'Live bibliography in Harvard, APA, MLA, and Vancouver styles',
    'Exports to DOCX, DOC, RTF, PDF, HTML, Markdown, and plain text',
    'Dashboard workspace designed for long writing sessions',
  ];

  return (
    <MarketingShell currentRoute="/features" onNavigate={onNavigate}>
      <main className="content-page">
        <span className="eyebrow">Features</span>
        <h1>Everything needed to move from draft to cited document.</h1>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature}>
              <span className="feature-card__icon">+</span>
              <p>{feature}</p>
            </article>
          ))}
        </div>
      </main>
    </MarketingShell>
  );
}

function AboutPage({ onNavigate }: { onNavigate: (path: Route) => void }) {
  return (
    <MarketingShell currentRoute="/about" onNavigate={onNavigate}>
      <main className="content-page content-page--narrow">
        <span className="eyebrow">About</span>
        <h1>Built for researchers who want fewer context switches.</h1>
        <p>
          AcademicOS brings the writing surface, source search, citation insertion, bibliography
          management, and document export into one quiet workspace. The app keeps the existing
          research assistant core intact while giving it a SaaS-ready product structure.
        </p>
      </main>
    </MarketingShell>
  );
}

function ContactPage({ onNavigate }: { onNavigate: (path: Route) => void }) {
  return (
    <MarketingShell currentRoute="/contact" onNavigate={onNavigate}>
      <main className="content-page content-page--narrow">
        <span className="eyebrow">Contact</span>
        <h1>Talk to us about academic writing workflows.</h1>
        <form className="contact-form">
          <label>
            Name
            <input type="text" name="name" autoComplete="name" />
          </label>
          <label>
            Email
            <input type="email" name="email" autoComplete="email" />
          </label>
          <label>
            Message
            <textarea name="message" rows={5} />
          </label>
          <button className="primary-link primary-link--button" type="button">
            Send message
          </button>
        </form>
      </main>
    </MarketingShell>
  );
}

function EditorWorkspace() {
  const { style, setStyle } = useDocument();

  return (
    <section className="dashboard-panel">
      <div className="dashboard-panel__header">
        <div>
          <span className="eyebrow">Editor</span>
          <h1>Writing workspace</h1>
          <p>Select text to search sources and insert citations without leaving the draft.</p>
        </div>
        <StyleSelector value={style} onChange={setStyle} />
      </div>

      <div className="workspace-grid">
        <EditorShell />
        <BibliographyPanel />
      </div>
    </section>
  );
}

function SourcesOverview({ onNavigate }: { onNavigate: (path: Route) => void }) {
  const { bibliography } = useDocument();
  const sourceCount = bibliography.length;

  return (
    <section className="dashboard-panel dashboard-panel--compact">
      <span className="eyebrow">Dashboard</span>
      <h1>Source command center</h1>
      <p>
        You have {sourceCount} {sourceCount === 1 ? 'source' : 'sources'} in the current draft.
        Open the editor to search, cite, import documents, and export the final file.
      </p>
      <button className="primary-link primary-link--button" type="button" onClick={() => onNavigate('/dashboard/editor')}>
        Open editor
      </button>
    </section>
  );
}

function DashboardShell({
  children,
  currentRoute,
  onNavigate,
}: {
  children: ReactNode;
  currentRoute: Route;
  onNavigate: (path: Route) => void;
}) {
  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <AppLink className="brand-lockup sidebar__brand" path="/" onNavigate={onNavigate}>
          <span className="brand-mark">A</span>
          <span>AcademicOS</span>
        </AppLink>

        <nav className="sidebar-nav" aria-label="Dashboard navigation">
          {dashboardNav.map((item) => (
            <AppLink
              key={item.path}
              className={currentRoute === item.path ? 'sidebar-link sidebar-link--active' : 'sidebar-link'}
              path={item.path}
              onNavigate={onNavigate}
            >
              <span>{item.label.charAt(0)}</span>
              {item.label}
            </AppLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <AppLink className="sidebar-link" path="/" onNavigate={onNavigate}>
            <span>H</span>
            Home
          </AppLink>
        </div>
      </aside>

      <main className="dashboard-main">{children}</main>
    </div>
  );
}

function RoutedApp() {
  const { route, navigate } = useRoute();
  const isDashboard = route === '/dashboard' || route === '/dashboard/editor';
  const page = useMemo(() => {
    switch (route) {
      case '/features':
        return <FeaturesPage onNavigate={navigate} />;
      case '/about':
        return <AboutPage onNavigate={navigate} />;
      case '/contact':
        return <ContactPage onNavigate={navigate} />;
      case '/dashboard':
        return (
          <DashboardShell currentRoute={route} onNavigate={navigate}>
            <SourcesOverview onNavigate={navigate} />
          </DashboardShell>
        );
      case '/dashboard/editor':
        return (
          <DashboardShell currentRoute={route} onNavigate={navigate}>
            <EditorWorkspace />
          </DashboardShell>
        );
      case '/':
      default:
        return <LandingPage onNavigate={navigate} />;
    }
  }, [navigate, route]);

  return <div className={isDashboard ? 'app app--dashboard' : 'app'}>{page}</div>;
}

export default function App() {
  return (
    <DocumentProvider>
      <RoutedApp />
    </DocumentProvider>
  );
}
