const fs = require('fs');
const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  "  useEffect(() => {",
  `  useEffect(() => {
    const handleNavigate = (e: CustomEvent) => {
      const { tab, search } = e.detail;
      setActiveTab(tab);
      setTimeout(() => setSearchQuery(search || ''), 10);
    };
    window.addEventListener('navigate', handleNavigate as EventListener);
    return () => window.removeEventListener('navigate', handleNavigate as EventListener);
  }, []);

  useEffect(() => {`
);

// We need to modify the useEffect that clears search query to not clear it if we just navigated.
// Actually, if we set the search query *after* the tab change, it should work. The tab change clears it, then our timeout sets it.
// Let's just remove the effect that clears the search query on tab change, or leave it. 
// If it's:
// useEffect(() => { setSearchQuery(''); }, [activeTab]);
// Then when activeTab changes, it clears it. Then setTimeout runs and sets it to the actual search. That's fine!

fs.writeFileSync(file, content);
