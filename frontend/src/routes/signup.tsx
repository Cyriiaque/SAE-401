import { useState } from 'react';
import Button from '../ui/buttons';
import { useNavigate } from 'react-router-dom';
import { register } from '../lib/loaders';

interface PasswordStrength {
  score: number;
  requirements: {
    minLength: boolean;
    hasNumber: boolean;
    hasUpper: boolean;
    hasLower: boolean;
    hasSpecial: boolean;
  };
}

export default function SignUp() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    requirements: {
      minLength: false,
      hasNumber: false,
      hasUpper: false,
      hasLower: false,
      hasSpecial: false,
    },
  });
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordHelpVisible, setIsPasswordHelpVisible] = useState(false);

  const checkPasswordStrength = (value: string) => {
    const requirements = {
      minLength: value.length >= 8,
      hasNumber: /\d/.test(value),
      hasUpper: /[A-Z]/.test(value),
      hasLower: /[a-z]/.test(value),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(value),
    };

    const score = Object.values(requirements).filter(Boolean).length;

    setPasswordStrength({ score, requirements });
  };

  const isFormValid = () => {
    return (
      fullName.trim() !== '' &&
      email.includes('@') &&
      username.length >= 3 &&
      passwordStrength.score === 5 &&
      password === confirmPassword &&
      confirmPassword !== ''
    );
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('');
    } else if (!emailRegex.test(email)) {
      setEmailError('Format d\'email invalide');
    } else {
      setEmailError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Vérifier les conditions du mot de passe
    const passwordErrors: string[] = [];

    if (!passwordStrength.requirements.minLength) {
      passwordErrors.push('Le mot de passe doit contenir au moins 8 caractères');
    }
    if (!passwordStrength.requirements.hasNumber) {
      passwordErrors.push('Le mot de passe doit contenir au moins un chiffre');
    }
    if (!passwordStrength.requirements.hasUpper) {
      passwordErrors.push('Le mot de passe doit contenir au moins une majuscule');
    }
    if (!passwordStrength.requirements.hasLower) {
      passwordErrors.push('Le mot de passe doit contenir au moins une minuscule');
    }
    if (!passwordStrength.requirements.hasSpecial) {
      passwordErrors.push('Le mot de passe doit contenir au moins un caractère spécial (!@#$%^&*)');
    }

    // Vérifier la correspondance des mots de passe
    if (password !== confirmPassword) {
      passwordErrors.push('Les mots de passe ne correspondent pas');
    }

    // Vérifier la longueur du nom et de la mention
    if (fullName.length > 20) {
      passwordErrors.push('Le nom ne doit pas dépasser 20 caractères');
    }
    if (username.length > 20) {
      passwordErrors.push('La mention ne doit pas dépasser 20 caractères');
    }

    // Si des erreurs existent, les afficher
    if (passwordErrors.length > 0) {
      setError(passwordErrors.join(' • '));
      return;
    }

    // Réinitialiser l'erreur si les conditions sont respectées
    setError('');

    if (!isFormValid()) return;

    try {
      setIsSubmitting(true);
      await register({
        email,
        password,
        name: fullName,
        mention: username
      });
      navigate('/signin?registered=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-orange transform rotate-180" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z"
            />
          </svg>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Créez votre compte
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="text-red-500 text-sm text-center">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange focus:border-orange"
                placeholder="Nom complet"
              />
            </div>
            <div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  validateEmail(e.target.value);
                }}
                className={`appearance-none rounded-lg relative block w-full px-3 py-2 border ${emailError ? 'border-red-500' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange focus:border-orange`}
                placeholder="Email"
              />
              {emailError && (
                <p className="mt-1 text-sm text-red-500">
                  {emailError}
                </p>
              )}
            </div>
            <div>
              <div className="relative flex items-center">
                <div className="absolute left-3 text-gray-500">@</div>
                <div className="absolute left-8 text-gray-300 self-stretch border-r border-gray-300 h-2/3"></div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => {
                    const sanitizedValue = e.target.value
                      .toLowerCase()
                      .replace(/\s/g, '');
                    setUsername(sanitizedValue);
                  }}
                  className="appearance-none rounded-lg relative block w-full pl-12 px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange focus:border-orange"
                  placeholder="nom_utilisateur"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    checkPasswordStrength(e.target.value);
                  }}
                  className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange focus:border-orange"
                  placeholder="Mot de passe"
                />
                <div className="relative group">
                  <button
                    type="button"
                    className="p-2 text-gray-400 hover:text-gray-600"
                    onClick={() => setIsPasswordHelpVisible(!isPasswordHelpVisible)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {isPasswordHelpVisible && (
                    <div className="absolute right-0 w-64 p-4 mt-2 space-y-2 text-sm bg-white rounded-lg border border-gray-400 z-10">
                      <div className="flex justify-end">
                        <button
                          onClick={() => setIsPasswordHelpVisible(false)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                      <p className="font-semibold text-gray-900">Le mot de passe doit contenir :</p>
                      <ul className="space-y-1">
                        <li className={`flex items-center gap-2 ${passwordStrength.requirements.minLength ? 'text-green-600' : 'text-gray-600'
                          }`}>
                          {passwordStrength.requirements.minLength ? '✓' : '•'} 8 caractères minimum
                        </li>
                        <li className={`flex items-center gap-2 ${passwordStrength.requirements.hasNumber ? 'text-green-600' : 'text-gray-600'
                          }`}>
                          {passwordStrength.requirements.hasNumber ? '✓' : '•'} Un chiffre
                        </li>
                        <li className={`flex items-center gap-2 ${passwordStrength.requirements.hasUpper ? 'text-green-600' : 'text-gray-600'
                          }`}>
                          {passwordStrength.requirements.hasUpper ? '✓' : '•'} Une majuscule
                        </li>
                        <li className={`flex items-center gap-2 ${passwordStrength.requirements.hasLower ? 'text-green-600' : 'text-gray-600'
                          }`}>
                          {passwordStrength.requirements.hasLower ? '✓' : '•'} Une minuscule
                        </li>
                        <li className={`flex items-center gap-2 ${passwordStrength.requirements.hasSpecial ? 'text-green-600' : 'text-gray-600'
                          }`}>
                          {passwordStrength.requirements.hasSpecial ? '✓' : '•'} Un caractère spécial (!@#$%^&*)
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-2">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 w-full rounded ${i < passwordStrength.score
                        ? [
                          'bg-red-500',
                          'bg-orange-500',
                          'bg-yellow-500',
                          'bg-lime-500',
                          'bg-green-500',
                        ][passwordStrength.score - 1]
                        : 'bg-gray-200'
                        }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange focus:border-orange"
                placeholder="Confirmer le mot de passe"
              />
            </div>
          </div>

          <div>
            <Button
              variant={isFormValid() ? "full" : "notallowed"}
              size="lg"
              className="w-full"
              type="submit"
              disabled={isSubmitting || !isFormValid()}
            >
              {isSubmitting ? 'Inscription...' : 'S\'inscrire'}
            </Button>
          </div>

          <div className="flex text-center items-center justify-between">
            Vous avez déjà un compte ?
            <Button
              variant="outline"
              size="default"
              onClick={() => navigate('/signin')}
            >
              Connexion
            </Button>

          </div>
        </form>
      </div>
    </div>
  );
} 