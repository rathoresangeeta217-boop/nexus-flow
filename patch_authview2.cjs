const fs = require('fs');
const file = 'src/components/AuthView.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  "</button>\n      </div>\n    </div>",
  `</button>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <button
            onClick={async () => {
              setAuthError('Seeding users... please wait.');
              try {
                const res = await fetch('/api/seed-users', { method: 'POST' });
                const data = await res.json();
                if (data.results && data.results.some(r => r.status === 'error' && r.error === 'OPERATION_NOT_ALLOWED')) {
                  setAuthError('Failed: You must enable "Email/Password" in Firebase Auth Console first!');
                } else if (data.success) {
                  setAuthError('Users seeded successfully! You can now log in.');
                } else {
                  setAuthError(data.error || 'Unknown error occurred.');
                }
              } catch (e) {
                setAuthError(e.message);
              }
            }}
            className="text-xs text-slate-400 hover:text-indigo-600 underline"
          >
            Developer: Seed System Accounts
          </button>
        </div>
      </div>
    </div>`
);

fs.writeFileSync(file, content);
