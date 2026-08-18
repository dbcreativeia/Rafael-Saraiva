const fs = require('fs');

let content = fs.readFileSync('src/components/NinaPassadore.tsx', 'utf8');

// Background body
content = content.replace('bg-gradient-to-br from-dark via-secondary to-primary', 'bg-[#102b31]');

// Banner
content = content.replace('bg-gradient-to-r from-orange-500 to-red-600', 'bg-[#ebb430]');
content = content.replace('text-white uppercase tracking-tight mb-4">\n              Material de Campanha', 'text-[#102b31] uppercase tracking-tight mb-4">\n              Material de Campanha');
content = content.replace('text-xl text-white/90 font-medium', 'text-xl text-[#102b31] font-medium');

// Buttons styles
content = content.replace(/border-orange-500/g, 'border-[#ebb430]');
content = content.replace(/bg-orange-50/g, 'bg-[#ebb430]/10');
content = content.replace(/hover:border-orange-300/g, 'hover:border-[#ebb430]/40');
content = content.replace(/text-orange-500/g, 'text-[#ebb430]');
content = content.replace(/text-gray-400/g, 'text-[#102b31]/40');
content = content.replace(/text-orange-600/g, 'text-[#ebb430]');
content = content.replace(/text-gray-600/g, 'text-[#102b31]/80');
content = content.replace(/text-gray-500/g, 'text-[#102b31]/60');

// Tag Receba em Casa
content = content.replace(/bg-red-600 text-white/g, 'bg-[#102b31] text-[#ebb430]');

// Form labels
content = content.replace(/text-gray-700/g, 'text-[#102b31]');
content = content.replace(/focus:ring-orange-500/g, 'focus:ring-[#ebb430]');

// Error box - let's keep it red for error semantics or change it to #ebb430. We'll leave red for errors.

// Warning box
content = content.replace(/bg-yellow-50/g, 'bg-[#ebb430]/10');
content = content.replace(/text-yellow-800/g, 'text-[#102b31]');
content = content.replace(/border-yellow-200/g, 'border-[#ebb430]/30');
content = content.replace(/text-yellow-600/g, 'text-[#ebb430]');

// Checkboxes text
content = content.replace(/text-orange-900/g, 'text-[#102b31]');

// Submit Button
content = content.replace('bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white', 'bg-[#ebb430] hover:bg-[#d4a22b] text-[#102b31]');

// Success states
content = content.replace(/bg-green-100/g, 'bg-[#ebb430]/20');
content = content.replace(/text-green-600/g, 'text-[#ebb430]');
content = content.replace(/text-gray-800/g, 'text-[#102b31]');

// Download triggers
content = content.replace(/bg-orange-100/g, 'bg-[#ebb430]/20');
content = content.replace(/hover:bg-orange-200/g, 'hover:bg-[#ebb430]/30');

// General text color overrides just in case
content = content.replace(/text-dark/g, 'text-[#102b31]');

fs.writeFileSync('src/components/NinaPassadore.tsx', content);
console.log("Colors updated.");
