const fs = require('fs');
let code = fs.readFileSync('src/components/MaterialCampanha.tsx', 'utf8');

const target = `                <button
                  type="button"
                  onClick={() => handleTipoMaterialSelect('impresso')}
                  className={\`flex-1 p-6 rounded-2xl border-4 transition-all \${
                    tipoMaterial === 'impresso'
                      ? 'border-orange-500 bg-orange-50 scale-105 shadow-lg'
                      : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'
                  }\`}
                >
                  <Box className={\`w-12 h-12 mx-auto mb-4 \${tipoMaterial === 'impresso' ? 'text-orange-500' : 'text-gray-400'}\`} />
                  <h3 className={\`text-xl font-black uppercase mb-1 \${tipoMaterial === 'impresso' ? 'text-orange-600' : 'text-gray-600'}\`}>Material Impresso</h3>
                  <div className="mb-2">
                    <span className="bg-red-600 text-white text-[10px] sm:text-xs font-black px-2 py-1 rounded uppercase tracking-wider animate-pulse">
                      Receba em Casa
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm font-medium">O kit campanha contém colinha, adesivo, santinho e santão. Disponível apenas para SP.</p>
                </button>`;

if(code.includes(target)) {
  code = code.replace(target, '');
  fs.writeFileSync('src/components/MaterialCampanha.tsx', code);
  console.log('Removed Material Impresso button');
} else {
  console.log('Target block not found');
}
