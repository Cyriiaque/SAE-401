import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePostModal } from '../contexts/PostModalContext';
import Button from '../ui/buttons';
import { useState, useEffect } from 'react';
import { getImageUrl } from '../lib/loaders';
import Avatar from '../ui/Avatar';

export default function Sidebar() {
    const { user, logout } = useAuth();
    const { openPostModal } = usePostModal();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleTweetPublished = () => {
            setIsMobileMenuOpen(false);
        };

        window.addEventListener('tweetPublished', handleTweetPublished);
        return () => {
            window.removeEventListener('tweetPublished', handleTweetPublished);
        };
    }, []);

    if (!user) return null;

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    return (
        <>
            {/* Bouton hamburger pour mobile */}
            <button
                onClick={toggleMobileMenu}
                className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-full hover:bg-gray-100 bg-white"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {/* Overlay pour mobile */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/30 backdrop-blur-md z-40 lg:hidden"
                    onClick={toggleMobileMenu}
                />
            )}

            {/* Sidebar */}
            <div className={`fixed left-0 top-0 h-screen w-64 border-r border-gray-200 p-4 flex flex-col bg-white z-40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* Logo */}
                <div className="mb-8 pt-12">
                    <h1 className="text-2xl font-bold text-orange">Rettiwt</h1>
                </div>

                {/* Navigation */}
                <nav className="flex-1">
                    <ul className="space-y-2">
                        <li>
                            <Link
                                to="/"
                                className={`flex items-center space-x-4 p-3 rounded-full hover:bg-gray-100 transition-colors group ${location.pathname === '/' ? 'font-bold text-orange' : 'hover:text-orange'}`}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <svg className={`w-6 h-6 ${location.pathname === '/' ? 'text-orange' : 'group-hover:text-orange'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                <span>Accueil</span>
                            </Link>
                        </li>
                        <li>
                            <Link
                                to="/profile"
                                className={`flex items-center space-x-4 p-3 rounded-full hover:bg-gray-100 transition-colors group ${location.pathname === '/profile' ? 'font-bold text-orange' : 'hover:text-orange'}`}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <svg className={`w-6 h-6 ${location.pathname === '/profile' ? 'text-orange' : 'group-hover:text-orange'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span>Profil</span>
                            </Link>
                        </li>
                        <li>
                            <Link
                                to="/settings"
                                className={`flex items-center space-x-4 p-3 rounded-full hover:bg-gray-100 transition-colors group ${location.pathname === '/settings' ? 'font-bold text-orange' : 'hover:text-orange'}`}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <svg
                                    className={`w-6 h-6 ${location.pathname === '/settings' ? 'text-orange' : 'group-hover:text-orange'}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                </svg>
                                <span>Paramètres</span>
                            </Link>
                        </li>
                        {user.roles?.includes('ROLE_ADMIN') && (
                            <li>
                                <Link
                                    to="/dashboard"
                                    className={`flex items-center space-x-4 p-3 rounded-full hover:bg-gray-100 transition-colors group ${location.pathname === '/dashboard' ? 'font-bold text-orange' : 'hover:text-orange'}`}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <svg className={`w-6 h-6 ${location.pathname === '/dashboard' ? 'text-orange' : 'group-hover:text-orange'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    <span>Dashboard</span>
                                </Link>
                            </li>
                        )}
                    </ul>
                </nav>

                {/* Bouton Poster */}
                <div className="p-4">
                    <Button
                        variant="full"
                        onClick={() => {
                            openPostModal();
                        }}
                        className="flex items-center justify-center px-14 py-6 space-x-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <p className="font-semibold">Poster</p>
                    </Button>
                </div>

                {/* Informations utilisateur et déconnexion */}
                <div className="mt-auto space-y-4">
                    <div className="flex items-center space-x-3 p-3">
                        <Avatar
                            src={user.avatar ? getImageUrl(user.avatar) : '/default_pp.webp'}
                            alt={user.name || 'Avatar par défaut'}
                            size="sm"
                        />
                        <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-gray-500 text-sm">@{user.mention}</p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="default"
                        onClick={() => {
                            logout();
                            window.location.href = '/signin';
                        }}
                        className="w-full"
                    >
                        Déconnexion
                    </Button>
                </div>
            </div>
        </>
    );
} 