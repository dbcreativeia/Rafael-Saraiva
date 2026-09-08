const fs = require('fs');
let code = fs.readFileSync('src/components/admin/CentralLeadsTab.tsx', 'utf8');

// Add previousIsRefreshing ref
code = code.replace(/useEffect\(\(\) => \{\n\s*let interval;/, `const previousIsRefreshing = useRef(summary?.isRefreshing);
  useEffect(() => {
    if (previousIsRefreshing.current === true && summary?.isRefreshing === false) {
      // Finished refreshing! Let's update the lists silently
      fetchLeadsPage(currentPage);
      fetchImportedBases();
      // And don't fetchSummary() here, we just got the false state from it
    }
    previousIsRefreshing.current = summary?.isRefreshing;
  }, [summary?.isRefreshing, currentPage]);

  useEffect(() => {
    let interval;`);

fs.writeFileSync('src/components/admin/CentralLeadsTab.tsx', code);
console.log('patched frontend');
