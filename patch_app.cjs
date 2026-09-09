const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  "const { user, profile, loading } = useAuth();",
  "const { user, profile, loading, authError } = useAuth();"
);

const bannerTarget = `<main className="flex-1 overflow-y-auto bg-slate-50 relative pb-20 lg:pb-0">`;
const bannerReplacement = `<main className="flex-1 overflow-y-auto bg-slate-50 relative pb-20 lg:pb-0">
        {authError && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mx-4 mt-4 rounded-r-lg shadow-sm">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700 font-medium">
                  {authError}
                </p>
                <p className="text-xs text-red-500 mt-1">
                  You are viewing cached or offline data. New updates will not be loaded.
                </p>
              </div>
            </div>
          </div>
        )}`;

content = content.replace(bannerTarget, bannerReplacement);
fs.writeFileSync('src/App.tsx', content);
console.log("Patched App.tsx");
