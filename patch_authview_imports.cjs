const fs = require('fs');
const file = 'src/components/AuthView.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  "import { useAuth } from '../contexts/AuthContext';",
  "import { useState } from 'react';\nimport { useAuth } from '../contexts/AuthContext';\nimport { signInWithEmailAndPassword } from 'firebase/auth';\nimport { auth } from '../lib/firebase';"
);

content = content.replace("const [email, setEmail] = require('react').useState('');", "const [email, setEmail] = useState('');");
content = content.replace("const [password, setPassword] = require('react').useState('');", "const [password, setPassword] = useState('');");
content = content.replace("const [authError, setAuthError] = require('react').useState('');", "const [authError, setAuthError] = useState('');");
content = content.replace("const [isSigningIn, setIsSigningIn] = require('react').useState(false);", "const [isSigningIn, setIsSigningIn] = useState(false);");
content = content.replace("const { signInWithEmailAndPassword } = require('firebase/auth');", "");
content = content.replace("const { auth } = require('../lib/firebase');", "");

fs.writeFileSync(file, content);
