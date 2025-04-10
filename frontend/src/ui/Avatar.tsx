interface AvatarProps {
    src?: string;
    alt: string;
    size?: 'sm' | 'md' | 'xl' | 'lg';
    className?: string;
    onClick?: () => void;
}

export default function Avatar({
    src,
    alt,
    size = 'md',
    className = '',
    onClick
}: AvatarProps) {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        xl: 'w-14 h-14',
        lg: 'w-16 h-16'
    };

    const defaultAvatar = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';

    return (
        <div
            className={`relative rounded-full overflow-hidden ${sizeClasses[size]} ${className}`}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
        >
            <img
                src={src || defaultAvatar}
                alt={alt}
                className="w-full h-full object-cover"
                onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = defaultAvatar;
                }}
            />
        </div>
    );
} 