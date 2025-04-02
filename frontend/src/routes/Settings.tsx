import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Button from '../ui/buttons';
import { useAuth } from '../contexts/AuthContext';
import { updateUserSettings } from '../lib/loaders';

export default function Settings() {
    const { user, setUser } = useAuth();

    // Initialiser l'état avec la valeur de post_reload de l'utilisateur
    const [refreshInterval, setRefreshInterval] = useState(
        user?.postReload && user.postReload > 0 ? user.postReload : 1
    );

    // L'état du toggle dépend de la valeur de post_reload
    const [isFeatureEnabled, setIsFeatureEnabled] = useState<boolean>(
        user?.postReload && user.postReload > 0 ? true : false
    );

    // État pour le mode lecture seule
    const [isReadOnlyMode, setIsReadOnlyMode] = useState<boolean>(
        user?.readOnly ? true : false
    );

    // État pour l'overlay d'aide
    const [showHelpOverlay, setShowHelpOverlay] = useState<boolean>(false);

    // Fonction pour mettre à jour les paramètres
    const handleToggleChange = async (enabled: boolean) => {
        try {
            const newPostReload = enabled ? refreshInterval : 0;
            const updatedUser = await updateUserSettings({ postReload: newPostReload });

            // Mettre à jour l'utilisateur dans le contexte
            setUser(updatedUser);

            // Mettre à jour les états locaux
            setIsFeatureEnabled(enabled);
            setRefreshInterval(enabled ? newPostReload : 1);
        } catch (error) {
            console.error('Erreur lors de la mise à jour', error);
        }
    };

    // Fonction pour mettre à jour l'intervalle
    const handleIntervalChange = async (interval: number) => {
        try {
            const updatedUser = await updateUserSettings({ postReload: interval });

            // Mettre à jour l'utilisateur dans le contexte
            setUser(updatedUser);

            // Remplacer la valeur de postReload dans user dans le localStorage
            localStorage.setItem('user', JSON.stringify(updatedUser));

            // Mettre à jour les états locaux
            setRefreshInterval(interval);
        } catch (error) {
            console.error('Erreur lors de la mise à jour', error);
        }
    };

    // Fonction pour mettre à jour le mode lecture seule
    const handleReadOnlyToggle = async (enabled: boolean) => {
        try {
            const updatedUser = await updateUserSettings({ readOnly: enabled });

            // Mettre à jour l'utilisateur dans le contexte
            setUser(updatedUser);

            // Mettre à jour le localStorage
            localStorage.setItem('user', JSON.stringify(updatedUser));

            // Mettre à jour l'état local
            setIsReadOnlyMode(enabled);
        } catch (error) {
            console.error('Erreur lors de la mise à jour du mode lecture seule', error);
        }
    };

    return (
        <div className="flex min-h-screen bg-white">
            <Sidebar />
            <div className="flex-1 lg:ml-64">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="border-b border-gray-200 sticky top-0 bg-white z-10">
                        <div className="p-5">
                            <h2 className="text-xl font-bold text-center">Paramètres</h2>
                        </div>
                    </div>

                    {/* Section Actualisation régulière */}
                    <div className='mt-8 flex flex-row gap-4 items-center'>
                        <h2 className="text-xl font-semibold">Actualisation régulière des posts</h2>
                        {/* Toggle On/Off */}
                        <div className="flex items-center">
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isFeatureEnabled}
                                    onChange={() => handleToggleChange(!isFeatureEnabled)}
                                    className="hidden"
                                />
                                <div
                                    className={`w-10 h-6 flex items-center bg-gray-300 rounded-full p-1 transition-colors duration-300 ${isFeatureEnabled ? 'bg-orange-500' : 'bg-gray-300'}`}
                                >
                                    <div
                                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${isFeatureEnabled ? 'translate-x-4' : ''}`}
                                    ></div>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Section Intervalle conditionnelle */}
                    {isFeatureEnabled && (
                        <section className="border border-gray-200 rounded-lg p-6 shadow-sm mt-4 mb-8">
                            <div className="space-y-4 mb-4">
                                <div className="flex justify-between items-center">
                                    <p className="font-medium">Intervalle d'actualisation (minutes)</p>
                                    <p className="text-gray-500">{refreshInterval} min</p>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <input
                                        type="range"
                                        min="1"
                                        max="9"
                                        value={refreshInterval}
                                        onChange={(e) => setRefreshInterval(Number(e.target.value))}
                                        className="w-full flex-grow"
                                    />
                                    <Button
                                        variant="full"
                                        onClick={() => handleIntervalChange(refreshInterval)}
                                        className="px-4 py-2"
                                    >
                                        Valider
                                    </Button>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Section Mode Lecture Seule */}
                    <div className='mt-8 flex flex-row gap-4 items-center'>
                        <h2 className="text-xl font-semibold">Mode Lecture Seule</h2>
                        <div className="flex items-center">
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isReadOnlyMode}
                                    onChange={() => handleReadOnlyToggle(!isReadOnlyMode)}
                                    className="hidden"
                                />
                                <div
                                    className={`w-10 h-6 flex items-center bg-gray-300 rounded-full p-1 transition-colors duration-300 ${isReadOnlyMode ? 'bg-orange-500' : 'bg-gray-300'}`}
                                >
                                    <div
                                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${isReadOnlyMode ? 'translate-x-4' : ''}`}
                                    ></div>
                                </div>
                            </label>
                        </div>
                        <button
                            onClick={() => setShowHelpOverlay(true)}
                            className="ml-2 text-gray-500 hover:text-gray-700"
                            title="Aide"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>
                    </div>

                    {/* Overlay d'aide pour le mode lecture seule */}
                    {showHelpOverlay && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md mx-4 relative">
                                <button
                                    onClick={() => setShowHelpOverlay(false)}
                                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                                <h3 className="text-xl font-bold mb-4">Mode Lecture Seule</h3>
                                <div className="space-y-4 text-gray-700">
                                    <p>
                                        Lorsque le mode lecture seule est activé, personne ne pourra répondre à vos posts.
                                    </p>
                                    <p>
                                        Cela peut être utile dans les situations suivantes :
                                    </p>
                                    <ul className="list-disc pl-5 space-y-2">
                                        <li>Vous souhaitez partager du contenu sans recevoir de commentaires</li>
                                        <li>Vous êtes temporairement indisponible pour interagir avec les réponses</li>
                                        <li>Vous voulez limiter les interactions sur votre compte</li>
                                    </ul>
                                    <p>
                                        Vos posts resteront visibles et pourront toujours être aimés, mais personne ne pourra y répondre tant que ce mode est activé.
                                    </p>
                                </div>
                                <div className="mt-6 flex justify-end">
                                    <Button
                                        variant="full"
                                        onClick={() => setShowHelpOverlay(false)}
                                        className="px-4 py-2"
                                    >
                                        J'ai compris
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}