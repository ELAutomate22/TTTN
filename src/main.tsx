import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { officialLinks, places, questions, videos, type VideoCategory } from "./content";
import "./styles.css";
import { useBufferedFilm } from './useBufferedFilm';

const Arrow = ({ diagonal = false }: { diagonal?: boolean }) => <span aria-hidden="true" className="arrow">{diagonal ? "↗" : "→"}</span>;

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function Header() {
  const [open, setOpen] = useState(false);
  const links = [["Watch", "#watch"], ["Play", "#play"], ["Places", "#places"], ["About", "#about"], ["Work with us", "#work"]];
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  return <header className="site-header">
    <a href="#top" className="brand" aria-label="Talk to the Nation, back to top"><span className="brand-mark">TTTN<span className="brand-dot">.</span></span><span className="brand-name">TALK TO<br/>THE NATION</span></a>
    <button type="button" className="menu-toggle" aria-expanded={open} aria-controls="site-nav" onClick={() => setOpen(!open)}>{open ? "Close" : "Menu"}<span aria-hidden="true">{open ? "×" : "+"}</span></button>
    <nav id="site-nav" className={open ? "site-nav is-open" : "site-nav"} aria-label="Main navigation">
      {links.map(([label, href]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}
      <a href="#contact" className="nav-contact" onClick={() => setOpen(false)}>Get in touch <Arrow diagonal /></a>
    </nav>
  </header>;
}

function ScrollFilm() {
  const frameRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const meterRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(10.04);
  const [ready, setReady] = useState(false);
  const [mediaAvailable, setMediaAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const { source, failed, retry, useNativeSource } = useBufferedFilm(!reduced);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reduced || !source) return;
    let attempts = 0;
    let retryTimer = 0;
    const loaded = () => { attempts = 0; setMediaAvailable(true); };
    const recover = () => {
      if (document.hidden || retryTimer || attempts >= 3) return;
      setMediaAvailable(false);
      retryTimer = window.setTimeout(() => {
        retryTimer = 0;
        if (document.hidden) return;
        attempts += 1;
        video.load();
      }, 1000 * (attempts + 1));
    };
    const resume = () => {
      if (document.hidden) return;
      if (video.error || video.readyState === 0) { attempts = 0; recover(); }
      else if (video.readyState >= 2) { setMediaAvailable(true); window.dispatchEvent(new Event('scroll')); }
    };
    video.addEventListener('loadeddata', loaded);
    video.addEventListener('error', recover);
    window.addEventListener('online', resume);
    window.addEventListener('pageshow', resume);
    document.addEventListener('visibilitychange', resume);
    if (video.readyState >= 2) loaded();
    return () => {
      clearTimeout(retryTimer);
      video.removeEventListener('loadeddata', loaded);
      video.removeEventListener('error', recover);
      window.removeEventListener('online', resume);
      window.removeEventListener('pageshow', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [reduced, source]);

  useEffect(() => {
    if (reduced) return;
    const video = videoRef.current;
    const frame = frameRef.current;
    if (!video || !frame) return;
    let raf = 0;
    let target = 0;
    let lastTime = 0;
    let range = 1;
    let top = 0;
    let currentStage = -1;
    const measure = () => {
      top = frame.getBoundingClientRect().top + window.scrollY;
      range = Math.max(1, frame.offsetHeight - window.innerHeight);
    };
    const seek = () => {
      if (document.hidden || open || video.readyState < 2 || video.seeking) return;
      const distance = target - video.currentTime;
      if (Math.abs(distance) < 1 / 48) return;
      // Finish one decode before seeking again; consume the newest scroll target.
      const now = performance.now();
      const elapsed = Math.min(200, Math.max(16, now - lastTime));
      lastTime = now;
      const eased = video.currentTime + distance * (1 - Math.exp(-elapsed / 65));
      video.currentTime = !source?.startsWith('blob:') || elapsed > 80 || Math.abs(distance) < .08 ? target : eased;
    };
    const update = () => {
      raf = 0;
      const next = Math.min(1, Math.max(0, (window.scrollY - top) / range));
      // Only text/chapter changes need React. The meter stays on the compositor.
      const stage = next > .7 ? 3 : next >= .66 ? 2 : next >= .29 ? 1 : 0;
      if (stage !== currentStage) { currentStage = stage; setProgress(next); }
      const meter = meterRef.current;
      if (meter) {
        meter.style.setProperty('--film-progress', String(next));
        meter.setAttribute('aria-valuenow', String(Math.round(next * 100)));
      }
      target = next * Math.max(0, duration - 0.05);
      if (window.scrollY > top + range + window.innerHeight || document.hidden || open) return;
      seek();
    };
    const schedule = () => { if (!raf) raf = window.requestAnimationFrame(update); };
    const resize = () => { measure(); schedule(); };
    const settled = () => { if (Math.abs(target - video.currentTime) >= 1 / 48) schedule(); };
    measure();
    video.addEventListener("seeked", settled);
    video.addEventListener("loadeddata", schedule);
    video.addEventListener("canplay", schedule);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", resize);
    schedule();
    return () => { window.removeEventListener("scroll", schedule); window.removeEventListener("resize", resize); video.removeEventListener("seeked", settled); video.removeEventListener("loadeddata", schedule); video.removeEventListener("canplay", schedule); if (raf) cancelAnimationFrame(raf); };
  }, [duration, reduced, ready, open, source]);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  const chapter = progress < .29 ? "From the world" : progress < .66 ? "To the street" : "To your turn";
  return <>
    <section id="top" ref={frameRef} className="film-scroll" aria-label="Scroll through the journey from Earth to the street">
      <div className="film-sticky">
        <img className="film-poster" src={reduced || progress > .7 ? '/media/street-poster.jpg' : '/media/earth-poster.jpg'} alt={reduced ? 'A TTTN microphone in a busy London street' : ''} aria-hidden={!reduced} />
        {!reduced && <video ref={videoRef} className={`film-video${mediaAvailable && source ? '' : ' is-unavailable'}`} src={source} onError={() => { if (source?.startsWith("blob:")) useNativeSource(); }} poster="/media/earth-poster.jpg" muted playsInline preload="auto" aria-hidden="true" onLoadedMetadata={event => { setDuration(event.currentTarget.duration || 10.04); setReady(true); }} />}
        <div className="film-shade" />
        <div className="film-noise" aria-hidden="true" />
        <div className={progress > .7 && !reduced ? "film-inner is-street" : "film-inner"}>
          <div className="film-kicker"><span className="signal" /> AN OPEN INVITATION TO THE CURIOUS <span className="kicker-index">001 / TTTN</span></div>
          {progress > .7 && !reduced ? <h1><span className="hero-pre">The mic is here.</span><span className="hero-main">YOUR<br/>TURN<span className="accent-period">.</span></span><span className="hero-final">Step up and answer.</span></h1> : <h1><span className="hero-pre">A world of</span><span className="hero-main">QUESTIONS<span className="accent-period">.</span></span><span className="hero-final">Your turn to answer.</span></h1>}
          <p className="hero-description">Real people. Unexpected answers. A microphone that goes wherever the conversation does.</p>
          <div className="hero-actions"><a href="#play" className="button button-acid">Take the challenge <Arrow /></a><a href="#watch" className="button button-outline">Meet the nation <Arrow /></a></div>
        </div>
        <div className="film-bottom">
          <div className="chapter"><span className="mono muted">NOW PLAYING</span><strong>{chapter}</strong></div>
          <div ref={meterRef} className="film-meter" role="progressbar" aria-label="Journey progress" aria-valuemin={0} aria-valuemax={100}><span /></div>
          <div className="film-tools"><span className="mono">SCROLL TO EXPLORE ↓</span><button type="button" onClick={() => setOpen(true)}>Play film ↗</button></div>
        </div>
        {!reduced && !source && <div className="film-loading" role="status">{failed ? <>Film unavailable. <button type="button" onClick={retry}>Retry</button></> : 'Preparing the journey. Keep exploring while it loads.'}</div>}
        <div className="vertical-label" aria-hidden="true">THE WORLD IS TALKING · ARE YOU LISTENING?</div>
      </div>
    </section>
    {open && <div className="film-dialog-backdrop" role="presentation" onMouseDown={() => setOpen(false)}><div className="film-dialog" role="dialog" aria-modal="true" aria-label="Play the introduction video" onMouseDown={event => event.stopPropagation()}><button type="button" className="dialog-close" onClick={() => setOpen(false)} aria-label="Close video">×</button><video src="/media/tttn-earth-london-original.mp4" poster="/media/street-poster.jpg" controls autoPlay playsInline /></div></div>}
  </>;
}

function Intro() {
  return <section className="intro-section section-pad" aria-labelledby="intro-heading"><div className="intro-top"><span className="section-label">01 / THE IDEA</span><span className="mini-line" /></div><div className="intro-grid"><p className="intro-aside">ONE QUESTION<br/>CAN CHANGE<br/>EVERYTHING.</p><div><h2 id="intro-heading">Good conversations start <em>somewhere.</em></h2><p>Talk to the Nation takes curious questions into real places and lets real people answer. Sometimes it’s a quick quiz. Sometimes it opens up an entirely new point of view.</p><a className="text-link" href="#about">Get to know us <Arrow /></a></div></div></section>;
}

function Marquee() {
  return <div className="marquee" aria-hidden="true"><div>REAL QUESTIONS <span>✳</span> REAL PEOPLE <span>✳</span> YOUR TURN <span>✳</span> REAL QUESTIONS <span>✳</span> REAL PEOPLE <span>✳</span> YOUR TURN <span>✳</span></div></div>;
}

function Watch() {
  const [filter, setFilter] = useState<"All" | VideoCategory>("All");
  const [search, setSearch] = useState("");
  const filtered = videos.filter(video => (filter === "All" || video.category === filter) && `${video.title} ${video.description} ${video.category}`.toLowerCase().includes(search.toLowerCase().trim()));
  return <section id="watch" className="watch-section section-pad" aria-labelledby="watch-heading"><div className="section-head"><span className="section-label">02 / WATCH</span><h2 id="watch-heading">The street has<br/><em>stories.</em></h2><p>From quick fire quizzes to conversations that stay with you. Pick something and press play.</p></div><div className="watch-controls"><div className="filter-tabs" role="group" aria-label="Filter videos">{(["All", "Quiz Time", "Conversations", "Ideas"] as const).map(item => <button type="button" key={item} className={filter === item ? "active" : ""} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}</div><label className="watch-search"><span className="sr-only">Search videos</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search stories" type="search" /><span aria-hidden="true">⌕</span></label></div><div className="video-grid" aria-live="polite">{filtered.map((video, index) => <a className={`video-card tone-${video.tone}`} key={video.id} href={video.href} target="_blank" rel="noopener noreferrer"><div className="card-top"><span className="mono">{video.eyebrow}</span><span className="card-arrow"><Arrow diagonal /></span></div><div className="card-art" aria-hidden="true"><span className="art-ring"/><span className="art-letter">{index % 2 ? "?" : "!"}</span><span className="art-caption">TTTN / ON THE STREET</span></div><div className="card-bottom"><span className="mono">{video.category}</span><h3>{video.title}</h3><p>{video.description}</p><span className="card-link">Watch on the original channel <Arrow diagonal /></span></div></a>)}</div>{filtered.length === 0 && <p className="empty-state">No stories match that search. Try a different word or category.</p>}<a className="text-link watch-more" href={officialLinks.youtube} target="_blank" rel="noopener noreferrer">Explore the full channel on YouTube <Arrow diagonal /></a></section>;
}

function Quiz() {
  const [started, setStarted] = useState(false);
  const [timed, setTimed] = useState(true);
  const [remaining, setRemaining] = useState(60);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [shareNote, setShareNote] = useState("");
  useEffect(() => {
    if (!started || finished || !timed) return;
    const timer = window.setInterval(() => setRemaining(value => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [started, finished, timed]);
  useEffect(() => { if (started && timed && remaining === 0) setFinished(true); }, [remaining, started, timed]);
  const begin = () => { setIndex(0); setChosen(null); setScore(0); setRemaining(60); setFinished(false); setStarted(true); setShareNote(""); };
  const pick = (answer: number) => { if (chosen !== null) return; setChosen(answer); if (answer === questions[index].correct) setScore(value => value + 1); };
  const next = () => { if (index === questions.length - 1) { setFinished(true); return; } setIndex(value => value + 1); setChosen(null); };
  const share = async () => {
    const message = `I got ${score}/${questions.length} on Talk to the Nation's street quiz. Your turn: ${window.location.origin}/#play`;
    try { if (navigator.share) await navigator.share({ title: "Your turn — TTTN", text: message }); else { await navigator.clipboard.writeText(message); setShareNote("Score copied to clipboard."); } } catch { setShareNote("Use your browser’s share or copy controls to share your score."); }
  };
  return <section id="play" className="quiz-section section-pad" aria-labelledby="quiz-heading"><div className="quiz-intro"><span className="section-label">03 / PLAY</span><div className="quiz-burst" aria-hidden="true">?</div><h2 id="quiz-heading">Now it’s<br/><em>your turn.</em></h2><p>Five questions. One minute. No pressure. Well, maybe a little.</p><div className="quiz-side-note"><span>01—05</span><span>STREET SMARTS / DAILY CURIOSITY</span></div></div><div className="quiz-panel" aria-live="polite">{!started ? <div className="quiz-start"><span className="mono">THE CHALLENGE / 001</span><h3>Think you’ve got<br/>the answers?</h3><p>Try five original questions inspired by the spirit of TTTN’s street quizzes. No account needed.</p><label className="time-toggle"><input type="checkbox" checked={timed} onChange={event => setTimed(event.target.checked)} /><span>60-second timer</span></label><button type="button" className="button button-dark" onClick={begin}>Start the quiz <Arrow /></button></div> : finished ? <div className="quiz-result"><span className="mono">THE RESULTS ARE IN</span><strong>{score}<span>/{questions.length}</span></strong><h3>{score === questions.length ? "You knew every answer." : score >= 3 ? "You held your own." : "Good questions make us think."}</h3><p>{timed && remaining === 0 ? "Time’s up. " : ""}There’s always another conversation to join.</p><div className="result-actions"><button type="button" className="button button-dark" onClick={begin}>Play again <Arrow /></button><button type="button" className="button button-outline-dark" onClick={share}>Share score ↗</button></div>{shareNote && <p className="share-note" role="status">{shareNote}</p>}</div> : <div className="quiz-question"><div className="quiz-meta"><span>QUESTION {String(index + 1).padStart(2, "0")} / {String(questions.length).padStart(2, "0")}</span><span>{timed ? `${remaining}s LEFT` : "NO TIMER"}</span></div><div className="question-progress" aria-hidden="true"><span style={{ width: `${(index / questions.length) * 100}%` }} /></div><h3>{questions[index].question}</h3><div className="answers">{questions[index].answers.map((answer, answerIndex) => <button type="button" key={answer} disabled={chosen !== null} className={chosen !== null && answerIndex === questions[index].correct ? "correct" : chosen === answerIndex ? "incorrect" : ""} onClick={() => pick(answerIndex)}><span>{String.fromCharCode(65 + answerIndex)}</span>{answer}<span className="answer-symbol" aria-hidden="true">{chosen !== null && answerIndex === questions[index].correct ? "✓" : chosen === answerIndex ? "×" : "↗"}</span></button>)}</div>{chosen !== null && <div className="answer-feedback"><p>{chosen === questions[index].correct ? "That’s right." : "Not quite."} {questions[index].explanation}</p><button type="button" className="text-link" onClick={next}>{index === questions.length - 1 ? "See results" : "Next question"} <Arrow /></button></div>}</div>}</div></section>;
}

function Places() {
  const [selected, setSelected] = useState(0);
  return <section id="places" className="places-section section-pad" aria-labelledby="places-heading"><div className="places-head"><span className="section-label">04 / EVERYWHERE HAS A VOICE</span><h2 id="places-heading">The question<br/><em>travels.</em></h2><p>Most TTTN interviews are filmed in London. The microphone has also travelled to other cities across the UK and abroad.</p></div><div className="places-layout"><div className="places-list" role="group" aria-label="Explore filming locations">{places.map((place, index) => <button key={place.city} type="button" aria-pressed={selected === index} className={selected === index ? "selected" : ""} onClick={() => setSelected(index)}><span className="mono">{place.index}</span><strong>{place.city}</strong><span aria-hidden="true">↗</span></button>)}</div><div className="place-display" aria-live="polite"><span className="place-stamp">TTTN / ON LOCATION</span><div className="place-orbit" aria-hidden="true"><span/><span/><span/></div><div className="place-copy"><span className="mono">{places[selected].country.toUpperCase()} / {places[selected].index}</span><h3>{places[selected].city}<span>.</span></h3><p>{places[selected].note}</p></div></div></div><p className="places-footnote">Locations are drawn from TTTN’s published description of its filming work. Individual clips are linked in Watch where verified.</p></section>;
}

function About() {
  return <section id="about" className="about-section section-pad" aria-labelledby="about-heading"><span className="section-label">05 / THE PEOPLE BEHIND THE QUESTIONS</span><div className="about-layout"><div className="about-title"><span className="about-asterisk" aria-hidden="true">✳</span><h2 id="about-heading">We believe<br/>everyone has<br/><em>a story.</em></h2></div><div className="about-copy"><span className="mono">CREATED & HOSTED BY QUINCY WASHINGTON</span><p>Talk to the Nation brings the camera and the question to the people. Creator and host Quincy Washington has built a format that moves easily between a quick street quiz and a thoughtful conversation.</p><p>What matters is the answer you didn’t expect—and the person behind it.</p><a className="text-link" href={officialLinks.quincy} target="_blank" rel="noopener noreferrer">Meet Quincy <Arrow diagonal /></a></div></div><div className="about-manifesto"><span>ENGAGE.</span><span>EDUCATE.</span><span>ELEVATE.</span></div></section>;
}

const services = [
  ["01", "Brand partnerships", "Bring your message into a TTTN format that people want to watch."],
  ["02", "Online campaigns", "Create social content built around authentic questions and responses."],
  ["03", "Public opinion interviews", "Hear candid reactions from people on the street. These interviews are qualitative, not a representative poll."],
  ["04", "Video production", "Take an idea from planning and filming through editing and distribution."],
  ["05", "Social media management", "Keep the conversation going with community content and engagement."],
];

function Work() {
  return <section id="work" className="work-section section-pad" aria-labelledby="work-heading"><div className="work-lead"><span className="section-label">06 / WORK WITH US</span><h2 id="work-heading">Make people<br/><em>talk.</em></h2><p>For brands and organisations with something worth asking, TTTN creates content that starts a real conversation.</p><a href="#contact" className="button button-acid">Start a conversation <Arrow /></a><p className="work-kit"><a className="text-link" href={`mailto:${officialLinks.email}?subject=${encodeURIComponent("TTTN media kit request")}`}>Request a media kit <Arrow diagonal /></a></p></div><div className="services"><span className="mono">WHAT WE DO</span>{services.map(([number, title, description]) => <details key={number}><summary><span className="mono">{number}</span><strong>{title}</strong><span className="detail-plus" aria-hidden="true">+</span></summary><p>{description}</p></details>)}</div></section>;
}

type ContactKind = "brand" | "idea";
function ContactForm({ kind }: { kind: ContactKind }) {
  const [message, setMessage] = useState("");
  const subject = kind === "brand" ? "TTTN partnership enquiry" : "A question for Talk to the Nation";
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const lines = kind === "brand"
      ? [`Name: ${data.get("name")}`, `Email: ${data.get("email")}`, `Organisation: ${data.get("organisation")}`, `Project type: ${data.get("type")}`, `Timing: ${data.get("timing")}`, "", String(data.get("message"))]
      : [`Name: ${data.get("name")}`, `Email: ${data.get("email")}`, `My idea / question:`, String(data.get("message"))];
    const url = `mailto:${officialLinks.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
    window.location.href = url;
    setMessage("Your email app should open with a draft. Please send it there to complete your enquiry. If it doesn’t open, email hello@talktothenation.com directly.");
  }
  return <form onSubmit={submit} className="contact-form"><div className="form-row"><label>YOUR NAME<input name="name" autoComplete="name" required placeholder="Name" /></label><label>EMAIL ADDRESS<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></label></div>{kind === "brand" && <><div className="form-row"><label>ORGANISATION<input name="organisation" required placeholder="Company or team" /></label><label>PROJECT TYPE<select name="type" required defaultValue=""><option value="" disabled>Select a service</option>{services.map(([, title]) => <option key={title}>{title}</option>)}<option>Something else</option></select></label></div><label>WHEN ARE YOU THINKING?<input name="timing" placeholder="A rough timeline is fine" /></label></>}<label>{kind === "brand" ? "TELL US ABOUT YOUR IDEA" : "WHAT SHOULD WE ASK?"}<textarea name="message" required minLength={10} rows={5} placeholder={kind === "brand" ? "What would you like to make happen?" : "Share your question, guest, or location idea."} /></label><button type="submit" className="button button-dark">Open email draft <Arrow /></button><p className="form-note">This opens your email app. Nothing is submitted through the website.</p>{message && <p className="form-status" role="status">{message}</p>}</form>;
}

function Contact() {
  const [tab, setTab] = useState<ContactKind>("brand");
  return <section id="contact" className="contact-section section-pad" aria-labelledby="contact-heading"><div className="contact-heading"><span className="section-label">07 / KEEP THE CONVERSATION GOING</span><h2 id="contact-heading">Got something<br/><em>to say?</em></h2><p>Bring us a project, a question, or a place we should visit. Good conversations begin with a message.</p><a href={`mailto:${officialLinks.email}`} className="direct-email">{officialLinks.email} <Arrow diagonal /></a></div><div className="contact-box"><div className="contact-tabs" role="tablist" aria-label="Contact topic"><button type="button" role="tab" aria-selected={tab === "brand"} onClick={() => setTab("brand")}>I have a project</button><button type="button" role="tab" aria-selected={tab === "idea"} onClick={() => setTab("idea")}>I have a question</button></div><ContactForm key={tab} kind={tab} /></div></section>;
}

function Footer() {
  return <footer className="footer"><div className="footer-top"><a className="footer-brand" href="#top">TALK TO<br/>THE NATION<span>.</span></a><p>Good questions bring<br/>people together.</p><a href="#top" className="back-top">Back to top ↑</a></div><div className="footer-links"><div><span className="mono">EXPLORE</span><a href="#watch">Watch</a><a href="#play">Play</a><a href="#places">Places</a><a href="#about">About</a><a href="#work">Work with us</a></div><div><span className="mono">FOLLOW</span><a href={officialLinks.instagram} target="_blank" rel="noopener noreferrer">Instagram ↗</a><a href={officialLinks.youtube} target="_blank" rel="noopener noreferrer">YouTube ↗</a><a href={officialLinks.tiktok} target="_blank" rel="noopener noreferrer">TikTok ↗</a><a href={officialLinks.snapchat} target="_blank" rel="noopener noreferrer">Snapchat ↗</a></div><div><span className="mono">SAY HELLO</span><a href={`mailto:${officialLinks.email}`}>{officialLinks.email}</a><a href={officialLinks.official} target="_blank" rel="noopener noreferrer">TTTN official site ↗</a><a href="/privacy.html">Privacy</a></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} TALK TO THE NATION</span><span>REAL PEOPLE. REAL QUESTIONS.</span></div></footer>;
}

function App() {
  return <><a className="skip-link" href="#main">Skip to content</a><Header /><main id="main"><ScrollFilm /><Intro /><Marquee /><Watch /><Quiz /><Places /><About /><Work /><Contact /></main><Footer /></>;
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
