const fs = require('fs');
let code = fs.readFileSync('src/components/admin/CentralLeadsTab.tsx', 'utf8');

// Clean up all the bad injections
code = code.replace(/  ShieldCheck, CityDistributionMap \} from '\.\.\/CityDistributionMap';/g, "import { CityDistributionMap } from '../CityDistributionMap';");
code = code.replace(/  ShieldCheck, spCitiesList, spCitiesCleanMap, spCitiesNormMap, fixMojibake, isSpCity, knownNonSpCities \} from '\.\.\/\.\.\/data\/spCities';/g, "import { spCitiesList, spCitiesCleanMap, spCitiesNormMap, fixMojibake, isSpCity, knownNonSpCities } from '../../data/spCities';");
code = code.replace(/  ShieldCheck,   ShieldCheck,/g, "");

// Inject properly
code = code.replace(/import \{\n  Search,/g, "import {\n  ShieldCheck,\n  Search,");

fs.writeFileSync('src/components/admin/CentralLeadsTab.tsx', code);
