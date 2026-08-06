const fs = require('fs');
let content = fs.readFileSync('src/components/Jogo.tsx', 'utf-8');

const target = `<div className="p-4 bg-white border-t border-gray-100 shrink-0">
              <button
                onClick={startGame}
                className="w-full bg-primary hover:bg-secondary text-white font-black py-4 rounded-xl transition-transform active:scale-95 uppercase tracking-wider"
              >
                Jogar Agora
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>`;

const replacement = `<div className="p-4 bg-white border-t border-gray-100 shrink-0">
              <button
                onClick={showInstructions}
                className="w-full bg-primary hover:bg-secondary text-white font-black py-4 rounded-xl transition-transform active:scale-95 uppercase tracking-wider"
              >
                Jogar Agora
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>`;

content = content.replace(target, replacement);

fs.writeFileSync('src/components/Jogo.tsx', content);
