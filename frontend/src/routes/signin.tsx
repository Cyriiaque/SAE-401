import { useState, useEffect } from 'react';
import Button from '../ui/buttons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { login, resendVerificationEmail } from '../lib/loaders';

export default function SignIn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      setSuccess('Votre email a bien été vérifié');
    } else if (searchParams.get('registered') === 'true') {
      setSuccess('Vérifiez votre boite mail, un email de vérification vous a été envoyé');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      const response = await login({ email, password });
      setUser(response.user);
      navigate('/');
    } catch (err: any) {
      if (err.message === "Ce compte a été bloqué pour non respect des conditions d'utilisation") {
        setError("Ce compte a été bloqué pour non respect des conditions d'utilisation");
      } else if (err.message === 'Veuillez vérifier votre email avant de vous connecter') {
        setError('Veuillez vérifier votre email avant de vous connecter');
        // Envoyer un nouvel email de vérification
        await handleResendVerification();
      } else {
        setError('Email ou mot de passe incorrect');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      const response = await resendVerificationEmail(email);
      setMessage(response.message);
      setIsSuccess(true);
    } catch (error) {
      setMessage((error as Error).message);
      setIsSuccess(false);
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
          <h1 className="text-2xl font-bold text-center mb-8">Connectez-vous à Rettiwt</h1>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="text-red-500 text-sm text-center">
              {error}
            </div>
          )}
          {success && (
            <div className="text-green-500 text-sm text-center">
              {success}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange focus:border-orange"
                placeholder="Email"
              />
            </div>
            <div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange focus:border-orange"
                placeholder="Mot de passe"
              />
            </div>
          </div>

          <div>
            <Button variant="full" size="lg" className="w-full" type="submit">
              {isSubmitting ? 'Connexion...' : 'Se connecter'}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            Vous n'avez pas de compte ?
            <Button
              variant="outline"
              size="default"
              onClick={() => navigate('/signup')}
            >
              S'inscrire
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 