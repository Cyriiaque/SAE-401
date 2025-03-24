import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Tweet } from '../lib/loaders';
import PostModal from '../components/PostModal';

interface PostModalContextType {
    openPostModal: () => void;
    closePostModal: () => void;
    onTweetPublished: (tweet: Tweet) => void;
}

const PostModalContext = createContext<PostModalContextType | undefined>(undefined);

export function PostModalProvider({ children, onTweetPublished }: { children: ReactNode; onTweetPublished: (tweet: Tweet) => void }) {
    const [isOpen, setIsOpen] = useState(false);

    const openPostModal = () => setIsOpen(true);
    const closePostModal = () => setIsOpen(false);

    useEffect(() => {
        const handleTweetPublished = (event: CustomEvent<Tweet>) => {
            onTweetPublished(event.detail);
        };

        window.addEventListener('tweetPublished', handleTweetPublished as EventListener);
        return () => {
            window.removeEventListener('tweetPublished', handleTweetPublished as EventListener);
        };
    }, [onTweetPublished]);

    return (
        <PostModalContext.Provider value={{ openPostModal, closePostModal, onTweetPublished }}>
            {children}
            <PostModal
                isOpen={isOpen}
                onClose={closePostModal}
                onTweetPublished={(tweet) => {
                    const event = new CustomEvent('tweetPublished', { detail: tweet });
                    window.dispatchEvent(event);
                    closePostModal();
                }}
            />
        </PostModalContext.Provider>
    );
}

export function usePostModal() {
    const context = useContext(PostModalContext);
    if (context === undefined) {
        throw new Error('usePostModal must be used within a PostModalProvider');
    }
    return context;
} 