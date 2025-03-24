import { useState } from 'react';
import { createPost, Tweet } from '../lib/loaders';
import { useAuth } from '../contexts/AuthContext';

interface PostModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTweetPublished: (tweet: Tweet) => void;
}

export default function PostModal({ isOpen, onClose, onTweetPublished }: PostModalProps) {
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const maxLength = 280;
    const { user } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || content.length > maxLength) return;

        setIsSubmitting(true);
        try {
            const response = await createPost(content);
            onTweetPublished(response);
            setContent('');
            onClose();
        } catch (error) {
            console.error('Erreur lors de la création du tweet:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-lg">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Créer un tweet</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-4">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Qu'avez-vous à dire ?"
                        className={`w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 ${content.length > maxLength
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-[#F05E1D]'
                            }`}
                        rows={4}
                        maxLength={maxLength}
                    />
                    <div className="mt-4 flex justify-between items-center">
                        <span className={`text-sm ${content.length > maxLength ? 'text-red-500' : 'text-gray-500'}`}>
                            {content.length}/{maxLength}
                        </span>
                        <button
                            type="submit"
                            disabled={!content.trim() || content.length > maxLength || isSubmitting}
                            className="bg-[#F05E1D] text-white px-6 py-2 rounded-full font-semibold hover:bg-[#D84E1A] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Publication...' : 'Publier'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
} 