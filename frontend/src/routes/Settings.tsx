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
                    <div className='mt-8 flex flex-row gap-4'>
                        <h2 className="text-xl font-semibold mb-6">Actualisation régulière des posts</h2>
                        {/* Toggle On/Off */}
                        <div className="mb-5 flex items-center">
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

                    {/* Section conditionnelle */}
                    {isFeatureEnabled && (
                        <section className="border border-gray-200 rounded-lg p-6 shadow-sm">
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
                </div>
            </div>
        </div>
    );
}