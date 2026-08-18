const fs = require('fs');

let content = fs.readFileSync('src/components/NinaPassadore.tsx', 'utf8');

const targetContent = `<div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start w-full max-w-3xl">
            {/* Left Column (Rafael) */}
            <div className="flex flex-col items-center gap-6">
              <img 
                src="https://lh3.googleusercontent.com/d/1Au3fx-HRtwi3cfPVYgmFn0sUHi85cRdr" 
                alt="Rafael Saraiva" 
                className="w-full rounded-[2rem] shadow-2xl object-contain hover:scale-[1.02] transition-transform duration-300" 
                referrerPolicy="no-referrer" 
              />
              <img 
                src="https://lh3.googleusercontent.com/d/1DRE7fE6PLBhM1JO54R5mj6Ka3IX86RH6" 
                alt="Rafael Saraiva Número" 
                className="w-56 object-contain hover:scale-[1.05] transition-transform duration-300" 
                referrerPolicy="no-referrer" 
              />
            </div>

            {/* Right Column (Nina) */}
            <div className="flex flex-col items-center gap-6">
              <img 
                src="https://lh3.googleusercontent.com/d/1z0IqiAVYyLGrrkcLbKI3e3inNGHd8lWf" 
                alt="Nina Passadore" 
                className="w-full rounded-[2rem] shadow-2xl object-contain hover:scale-[1.02] transition-transform duration-300" 
                referrerPolicy="no-referrer" 
              />
              <a 
                href="https://ninapassadore.com.br" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="transition-transform hover:scale-105 duration-300"
              >
                <img 
                  src="https://lh3.googleusercontent.com/d/12aNB9dxOFZS2XjrvFrOLl1yTXgpaihrz" 
                  alt="Nina Passadore Site" 
                  className="w-56 object-contain" 
                  referrerPolicy="no-referrer" 
                />
              </a>
            </div>
          </div>`;

const newContent = `<div className="grid grid-cols-2 gap-4 md:gap-8 items-end w-full max-w-4xl relative">
            {/* Left Column (Rafael) */}
            <div className="flex flex-col items-center">
              <img 
                src="https://lh3.googleusercontent.com/d/1Au3fx-HRtwi3cfPVYgmFn0sUHi85cRdr" 
                alt="Rafael Saraiva" 
                className="w-full object-contain [mask-image:linear-gradient(to_bottom,black_60%,transparent_100%)] hover:scale-[1.02] transition-transform duration-300" 
                referrerPolicy="no-referrer" 
              />
              <img 
                src="https://lh3.googleusercontent.com/d/1DRE7fE6PLBhM1JO54R5mj6Ka3IX86RH6" 
                alt="Rafael Saraiva Número" 
                className="w-full max-w-[280px] object-contain hover:scale-[1.05] transition-transform duration-300 -mt-6 md:-mt-12 relative z-10" 
                referrerPolicy="no-referrer" 
              />
            </div>

            {/* Right Column (Nina) */}
            <div className="flex flex-col items-center">
              <img 
                src="https://lh3.googleusercontent.com/d/1z0IqiAVYyLGrrkcLbKI3e3inNGHd8lWf" 
                alt="Nina Passadore" 
                className="w-full object-contain [mask-image:linear-gradient(to_bottom,black_60%,transparent_100%)] hover:scale-[1.02] transition-transform duration-300" 
                referrerPolicy="no-referrer" 
              />
              <a 
                href="https://ninapassadore.com.br" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="transition-transform hover:scale-105 duration-300 -mt-6 md:-mt-12 relative z-10 w-full max-w-[280px] flex justify-center"
              >
                <img 
                  src="https://lh3.googleusercontent.com/d/12aNB9dxOFZS2XjrvFrOLl1yTXgpaihrz" 
                  alt="Nina Passadore Site" 
                  className="w-full object-contain" 
                  referrerPolicy="no-referrer" 
                />
              </a>
            </div>
          </div>`;

content = content.replace(targetContent, newContent);

fs.writeFileSync('src/components/NinaPassadore.tsx', content);

