import { cva } from "class-variance-authority";
import { cn } from "../../utils/cn";

const buttonVariants = cva("rounded-full font-bold focus:outline-none transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed", {
  variants: {
    variant: {
      default:
        "bg-black text-white hover:bg-gray-900 focus:bg-gray-900 disabled:hover:bg-black",
      outline:
        "border border-orange text-orange hover:bg-light-orange disabled:hover:bg-transparent",
      full:
        "bg-orange text-white hover:bg-dark-orange",
      notallowed:
        "bg-soft-orange text-white cursor-not-allowed",
      danger:
        "bg-red-500 text-white hover:bg-red-600 focus:bg-red-600 disabled:hover:bg-red-500",
    },
    size: {
      default: "h-10 px-4 py-2",
      sm: "h-9 px-3",
      lg: "h-11 px-8",
      xl: "h-14 px-8 text-lg",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

// Interface simplifiée avec uniquement les props nécessaires

interface ButtonPropsCVA {
  variant?: "default" | "outline" | "full" | "notallowed" | "danger";
  size?: "default" | "sm" | "lg" | "xl";
  className?: string;
}

interface ButtonPropsdata {
  children?: React.ReactNode;
}

interface ButtonPropsLogic {
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  title?: string;
}

type ButtonProps = ButtonPropsCVA & ButtonPropsdata & ButtonPropsLogic;

export default function Button({
  variant,
  size,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}